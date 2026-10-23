// Turns OCR words into a token stream that remembers which word each token came
// from, so a match can be traced back to a box on the label.
import { tokens, squash, similarity } from './text.js'

export function indexWords(words) {
  const toks = []
  words.forEach((w, wi) => {
    for (const t of tokens(w.text)) toks.push({ t, wi })
  })
  const spans = []
  let at = 0
  for (const w of words) { spans.push([at, at + w.text.length]); at += w.text.length + 1 }
  return { words, toks, spans, text: words.map((w) => w.text).join(' ') }
}

const runWords = (index, from, to) => [...new Set(index.toks.slice(from, to).map((k) => k.wi))].map((i) => index.words[i])
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)

// Box and average confidence for a run of tokens.
export function locate(index, from, to) {
  return boxOf(index, [...new Set(index.toks.slice(from, to).map((k) => k.wi))])
}

// The label's own words for a run of tokens, as printed (case and punctuation kept).
export function textOf(index, from, to) {
  const wis = [...new Set(index.toks.slice(from, to).map((k) => k.wi))]
  return wis.map((i) => index.words[i].text).join(' ')
}

// Same, for a character range in index.text (used for regex matches).
export function locateChars(index, start, end) {
  const wis = []
  index.spans.forEach(([a, b], i) => { if (a < end && b > start) wis.push(i) })
  return boxOf(index, wis)
}

// Box and average confidence for a list of word numbers.
export const boxOfWords = (index, wis) => boxOf(index, wis)

function boxOf(index, wis) {
  const ws = wis.map((i) => index.words[i])
  if (!ws.length) return { bbox: null, confidence: 0 }
  return {
    bbox: {
      x0: Math.min(...ws.map((w) => w.bbox.x0)), y0: Math.min(...ws.map((w) => w.bbox.y0)),
      x1: Math.max(...ws.map((w) => w.bbox.x1)), y1: Math.max(...ws.map((w) => w.bbox.y1)),
    },
    confidence: Math.round(mean(ws.map((w) => w.confidence))),
  }
}

// Best place in the label text for a phrase. Windows of the phrase length plus
// or minus one token are compared as one squashed string. skip(i) lets the
// caller ignore windows, for example brand names inside the bottler line.
export function bestWindow(index, phrase, skip = () => false) {
  const want = squash(phrase)
  const n = tokens(phrase).length
  let best = { score: 0, from: 0, to: 0, conf: 0 }
  for (let i = 0; i < index.toks.length; i++) {
    if (skip(i)) continue
    for (let len = Math.max(1, n - 1); len <= n + 1 && i + len <= index.toks.length; len++) {
      const got = index.toks.slice(i, i + len).map((k) => k.t).join('')
      const score = similarity(want, got)
      if (score < best.score) continue
      // Equal scores: prefer the reading the OCR was surer of (the same name can
      // appear twice, once in a plain font and once in a decorative one).
      const conf = mean(runWords(index, i, i + len).map((w) => w.confidence))
      if (score > best.score || conf > best.conf) best = { score, from: i, to: i + len, conf }
    }
  }
  return best
}

// The label's words grouped into lines of text (words side by side, the same panel), top to
// bottom, each with the tallest word's height. Used to say what the label does show when
// what the application names is not on it.
export function textLines(index) {
  const items = index.words
    .map((w, i) => ({ i, w, cy: (w.bbox.y0 + w.bbox.y1) / 2, h: w.bbox.y1 - w.bbox.y0, panel: w.panel ?? 0 }))
    .filter((x) => /[A-Za-z0-9]/.test(x.w.text))
    .sort((a, b) => a.panel - b.panel || a.cy - b.cy)
  const lines = []
  for (const it of items) {
    const line = lines.find((l) => l.panel === it.panel && Math.abs(l.cy - it.cy) < Math.max(l.h, it.h) * 0.6)
    if (line) { line.items.push(it); line.cy = (line.cy * (line.items.length - 1) + it.cy) / line.items.length; line.h = Math.max(line.h, it.h) }
    else lines.push({ panel: it.panel, cy: it.cy, h: it.h, items: [it] })
  }
  return lines.map((l) => {
    const sorted = l.items.sort((a, b) => a.w.bbox.x0 - b.w.bbox.x0)
    return {
      text: sorted.map((x) => x.w.text).join(' '), wis: sorted.map((x) => x.i), height: l.h, y: l.cy, panel: l.panel,
      confidence: mean(sorted.map((x) => x.w.confidence)),
    }
  })
}
