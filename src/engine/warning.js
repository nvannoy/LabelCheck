// Government warning check, 27 CFR 16.21 and 16.22.
// Three results: match, mismatch, check. Compared word for word against the
// statute after normalizing only whitespace and line breaks (OCR words are
// already whitespace-separated). Bold type and size cannot be read from OCR,
// so they are always returned as byEye items for the agent.
import { indexWords, bestWindow } from './words.js'

export const WARNING_TEXT =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.'

export const WARNING_BY_EYE = [
  'Bold type: "GOVERNMENT WARNING" must be bold and the rest must not be.',
  'Type size and characters per inch (27 CFR 16.22).',
  'The statement is separate and apart from other information, readable, and on a contrasting background.',
]

const EXPECTED = WARNING_TEXT.split(/\s+/)
const SURE = 85 // OCR confidence at or above this means a wrong word is a real difference

// Edit script between the statute and the label words. Each op is
// {kind: 'sub' | 'ins' | 'del', want, got, conf}.
function align(want, got) {
  const n = want.length, m = got.length
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 0; i <= n; i++) d[i][0] = i
  for (let j = 0; j <= m; j++) d[0][j] = j
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (want[i - 1] === got[j - 1].text ? 0 : 1))
  const ops = []
  let i = n, j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && want[i - 1] === got[j - 1].text && d[i][j] === d[i - 1][j - 1]) { i--; j--; continue }
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) { ops.push({ kind: 'sub', want: want[i - 1], got: got[j - 1].text, conf: got[j - 1].confidence, at: i - 1 }); i--; j--; continue }
    if (j > 0 && d[i][j] === d[i][j - 1] + 1) { ops.push({ kind: 'ins', want: '', got: got[j - 1].text, conf: got[j - 1].confidence, at: i }); j--; continue }
    ops.push({ kind: 'del', want: want[i - 1], got: '', conf: 100, at: i - 1 }); i--
  }
  return ops.reverse()
}

const caseOnly = (op) => op.kind === 'sub' && op.want.toLowerCase() === op.got.toLowerCase()
// OCR often drops or adds punctuation, so a difference in capitals or
// punctuation alone is sent to the agent instead of being called a mismatch.
const plain = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const softOnly = (op) => op.kind === 'sub' && plain(op.want) !== '' && plain(op.want) === plain(op.got)

export function checkWarning(words) {
  const base = { byEye: WARNING_BY_EYE, expected: WARNING_TEXT }
  const index = indexWords(words)
  const anchor = bestWindow(index, 'government warning')
  if (anchor.score < 0.85) {
    return { ...base, status: 'check', found: null, reason: 'The government warning was not found. It may be missing, or the image may be too unclear to read.' }
  }

  // Statement runs from the anchor word to "problems." (or the end of the text).
  const startWord = index.toks[anchor.from].wi
  const after = words.slice(startWord)
  let end = after.length
  const last = after.findIndex((w, i) => i >= 30 && /^problems\.?$/i.test(w.text))
  if (last >= 0) end = last + 1
  // Artwork behind the text (hops, borders) produces stray marks such as "\" or "P;".
  // A mark that is both unsure and not a word is dropped, and the agent is told.
  const raw = after.slice(0, end)
  const got = raw.filter((w) => !(w.confidence < 70 && !/[A-Za-z0-9]{2,}/.test(w.text)))
  const ignored = raw.length - got.length
  const text = got.map((w) => w.text).join(' ')
  const place = {
    found: text,
    confidence: Math.round(got.reduce((a, w) => a + w.confidence, 0) / got.length),
    bbox: {
      x0: Math.min(...got.map((w) => w.bbox.x0)), y0: Math.min(...got.map((w) => w.bbox.y0)),
      x1: Math.max(...got.map((w) => w.bbox.x1)), y1: Math.max(...got.map((w) => w.bbox.y1)),
    },
  }

  const ops = align(EXPECTED, got)
  if (!ops.length) {
    const note = ignored ? ` (${ignored} stray ${ignored === 1 ? 'mark' : 'marks'} from the artwork ignored)` : ''
    return { ...base, ...place, status: 'match', reason: `The warning matches the required wording exactly${note}.` }
  }

  const title = ops.filter((o) => o.at < 2 && caseOnly(o) && o.conf >= SURE)
  if (title.length) {
    return { ...base, ...place, status: 'mismatch', reason: `"GOVERNMENT WARNING:" must be in capital letters. The label has "${got.slice(0, 2).map((w) => w.text).join(' ')}".` }
  }
  if (ops.every(softOnly)) {
    return { ...base, ...place, status: 'check', reason: 'The words match the statute but some capital letters or punctuation marks differ. Confirm by eye.' }
  }
  const sure = ops.filter((o) => (o.kind === 'sub' || o.kind === 'ins') && !softOnly(o) && o.conf >= SURE)
  if (sure.length) {
    const first = sure[0]
    const what = first.kind === 'ins' ? `extra word "${first.got}"` : `"${first.got}" where the statute has "${first.want}"`
    return { ...base, ...place, status: 'mismatch', reason: `The wording differs from the statute: ${what}${sure.length > 1 ? ` (and ${sure.length - 1} more)` : ''}.` }
  }
  return { ...base, ...place, status: 'check', reason: 'Some warning words were unclear or missing in the read. Confirm the wording by eye.' }
}
