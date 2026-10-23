// One comparator per field. Each takes the label index and the application
// and returns {status, reason, found, confidence, bbox}.
// Statuses: match, check (uncertain or not found), mismatch (clearly different).
// Uncertain never passes (CLAUDE.md rule 7). Fuzzy matching is used only for
// the brand, class and bottler; never for the warning, ABV or net contents.
import { tokens } from './text.js'
import { bestWindow, locate, locateChars, textOf } from './words.js'
import { parseAbv, parseNetContents, sameAmount, parseCountryPhrases } from './parse.js'

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

// Two parts of one amount ("1 PINT," and "0.9 FL. OZ.") are often printed on separate
// lines, so they are not next to each other in the text. They are joined when the
// second sits right under or right beside the first.
function near(a, b) {
  const h = Math.max(a.y1 - a.y0, b.y1 - b.y0)
  const gapX = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1))
  const gapY = Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1))
  const sameLine = Math.abs((a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2) < h * 0.6 && gapX <= h * 2
  const overlapX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const stacked = gapY <= h * 1.2 && overlapX >= 0.4 * Math.min(a.x1 - a.x0, b.x1 - b.x0)
  return sameLine || stacked
}

function joinParts(items) {
  const used = new Set()
  const out = []
  items.forEach((a, i) => {
    if (used.has(i)) return
    const j = a.system === 'us' ? items.findIndex((b, k) => k !== i && !used.has(k) && b.system === 'us' && b.ml < a.ml && near(a.bbox, b.bbox)) : -1
    if (j < 0) { out.push(a); return }
    const b = items[j]
    used.add(j)
    out.push({
      ...a, ml: Math.round((a.ml + b.ml) * 10) / 10, raw: `${a.raw}, ${b.raw}`,
      confidence: Math.round((a.confidence + b.confidence) / 2),
      bbox: { x0: Math.min(a.bbox.x0, b.bbox.x0), y0: Math.min(a.bbox.y0, b.bbox.y0), x1: Math.max(a.bbox.x1, b.bbox.x1), y1: Math.max(a.bbox.y1, b.bbox.y1) },
    })
  })
  return out
}

// Net contents: compared as an amount after converting units to millilitres, with no
// fuzzy matching. See sameAmount for the one rounding allowance between unit systems.
// An amount with two parts is added up. If the label shows only one part of the
// application's amount, that is a Check (the rest may be printed apart or unread),
// not a mismatch.
export function netContents(index, application) {
  const want = parseNetContents(application.netContents)[0]
  const parts = parseNetContents(application.netContents, { merge: false })
  const found = parseNetContents(index.text).map((g) => ({ ...g, ...locateChars(index, g.start, g.start + g.raw.length) }))
  const got = joinParts(found)
  if (!got.length) return notFound('Net contents')
  const place = (g) => ({ bbox: g.bbox, confidence: g.confidence })
  const hit = want && got.find((g) => sameAmount(g, want))
  if (hit) return lowConfidence({ status: 'match', found: hit.raw, ...place(hit), reason: `The label states ${hit.raw}${hit.raw.endsWith('.') ? '' : '.'}` }, 'The net contents')
  const partial = parts.length > 1 && got.find((g) => parts.some((p) => sameAmount(g, p)))
  if (partial) {
    return { status: 'check', found: partial.raw, ...place(partial), reason: `The label shows ${partial.raw}, which is only part of the application's ${application.netContents}. The rest may be printed apart or not read.` }
  }
  return { status: 'mismatch', found: got[0].raw, ...place(got[0]), reason: `The label states ${got[0].raw} but the application says ${application.netContents}.` }
}

// Bottler name and address: looser match, and never worse than Needs Review.
// The name and the city are often printed in different places on a label, so
// the name part (before the first comma) and the address part are each looked
// for as a run of words anywhere. Both must be found nearly exactly to match,
// and a name that is only partly right is never enough.
export function bottler(index, application) {
  const [name, ...rest] = application.bottler.split(',').map((x) => x.trim()).filter(Boolean)
  const address = rest.join(' ')
  const whole = bestWindow(index, application.bottler)
  const nameW = bestWindow(index, name)
  const addrW = address ? bestWindow(index, address) : null
  const apart = Boolean(addrW) && nameW.score >= 0.95 && addrW.score >= 0.9
  const together = whole.score >= 0.95
  if (together || apart) {
    const place = together ? locate(index, whole.from, whole.to) : locate(index, nameW.from, nameW.to)
    const found = together ? textOf(index, whole.from, whole.to) : `${textOf(index, nameW.from, nameW.to)}; elsewhere: ${textOf(index, addrW.from, addrW.to)}`
    const where = together ? '' : ' The name and the address are printed apart on the label.'
    return lowConfidence({ status: 'match', found, ...place, reason: `The bottler name and address match.${where}` }, 'The bottler name and address')
  }
  const score = Math.max(whole.score, addrW ? (nameW.score + addrW.score) / 2 : nameW.score)
  if (score >= 0.6) {
    const place = locate(index, nameW.from, nameW.to)
    const found = textOf(index, nameW.from, nameW.to)
    return { status: 'check', found, ...place, reason: `The label has "${found}", which is similar to the application but not the same. Compare the name and address.` }
  }
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
