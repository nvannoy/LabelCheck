// One comparator per field. Each takes the label index and the application
// and returns {status, reason, found, confidence, bbox}.
// Statuses: match, check (uncertain or not found), mismatch (clearly different).
// Uncertain never passes (CLAUDE.md rule 7). Fuzzy matching is used only for
// the brand, class and bottler; never for the warning, ABV or net contents.
import { tokens } from './text.js'
import { bestWindow, locate, locateChars, textOf } from './words.js'
import { parseAbv, parseNetContents, parseCountryPhrases } from './parse.js'

const LOW_CONFIDENCE = 70

const notFound = (what) => ({ status: 'check', found: null, confidence: 0, bbox: null, reason: `${what} was not found on the label. It may be missing or misread.` })

function lowConfidence(r, what) {
  return r.confidence < LOW_CONFIDENCE
    ? { ...r, status: 'check', reason: `${what} was found but the read is uncertain (confidence ${r.confidence}). Confirm by eye.` }
    : r
}

// Brand name: tolerates case, punctuation and apostrophes only (rule 6).
// A hit inside the bottler line ("Bottled by Harlan Ridge ...") does not count,
// otherwise a wrong brand would pass because the bottler shares its name.
export function brand(index, application) {
  const afterBy = (i) => i > 0 && /^(by|for)$/.test(index.toks[i - 1].t)
  const w = bestWindow(index, application.brand, afterBy)
  const place = locate(index, w.from, w.to)
  const found = textOf(index, w.from, w.to)
  if (w.score === 1) return lowConfidence({ status: 'match', found, ...place, reason: 'The brand name matches.' }, 'The brand name')
  if (w.score >= 0.8) return { status: 'check', found, ...place, reason: `The label has "${found}", which is close to "${application.brand}" but not the same.` }
  return notFound('The brand name')
}

// Class and type: normalized text match.
export function classType(index, application) {
  const w = bestWindow(index, application.classType)
  const place = locate(index, w.from, w.to)
  const found = textOf(index, w.from, w.to)
  if (w.score === 1) return lowConfidence({ status: 'match', found, ...place, reason: 'The class and type match.' }, 'The class and type')
  if (w.score >= 0.8) return { status: 'check', found, ...place, reason: `The label has "${found}", which is close to "${application.classType}" but not the same.` }
  return notFound('The class and type')
}

// Alcohol content: the number is compared exactly, no fuzzy matching.
export function abv(index, application) {
  const want = parseAbv(application.abv)[0]?.value
  const got = parseAbv(index.text)
  if (!got.length) return notFound('A percentage alcohol by volume')
  const hit = got.find((g) => g.value === want)
  const shown = hit ?? got[0]
  const place = locateChars(index, shown.start, shown.start + shown.raw.length)
  if (hit) return lowConfidence({ status: 'match', found: hit.raw, ...place, reason: `The label states ${hit.value}% alcohol by volume.` }, 'The alcohol content')
  return { status: 'mismatch', found: got[0].raw, ...place, reason: `The label states ${got[0].value}% but the application says ${want}%.` }
}

// Net contents: compared exactly after converting units to millilitres.
export function netContents(index, application) {
  const want = parseNetContents(application.netContents)[0]?.ml
  const got = parseNetContents(index.text)
  if (!got.length) return notFound('Net contents')
  const hit = got.find((g) => g.ml === want)
  const shown = hit ?? got[0]
  const place = locateChars(index, shown.start, shown.start + shown.raw.length)
  if (hit) return lowConfidence({ status: 'match', found: hit.raw, ...place, reason: `The label states ${hit.raw}.` }, 'The net contents')
  return { status: 'mismatch', found: got[0].raw, ...place, reason: `The label states ${got[0].raw} but the application says ${application.netContents}.` }
}

// Bottler name and address: looser match, and never worse than Needs Review.
export function bottler(index, application) {
  const w = bestWindow(index, application.bottler)
  const place = locate(index, w.from, w.to)
  const found = textOf(index, w.from, w.to)
  if (w.score >= 0.95) return lowConfidence({ status: 'match', found, ...place, reason: 'The bottler name and address match.' }, 'The bottler name and address')
  if (w.score >= 0.6) return { status: 'check', found, ...place, reason: `The label has "${found}", which is similar to the application but not the same. Compare the name and address.` }
  return notFound('The bottler name and address')
}

// Country of origin: imports only, best effort.
export function country(index, application) {
  const want = tokens(application.country ?? '')
  const phrases = parseCountryPhrases(index.text).map(tokens)
  if (!phrases.length) return notFound('The country of origin')
  const hit = phrases.find((p) => want.every((t, i) => p[i] === t))
  const w = bestWindow(index, application.country ?? '')
  const place = locate(index, w.from, w.to)
  if (hit) return lowConfidence({ status: 'match', found: want.join(' '), ...place, reason: `The label names ${application.country} as the country of origin.` }, 'The country of origin')
  return { status: 'mismatch', found: phrases[0].join(' '), ...place, reason: `The label names "${phrases[0].join(' ')}" but the application says ${application.country}.` }
}
