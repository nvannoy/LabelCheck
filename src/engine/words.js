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
  let best = { score: 0, from: 0, to: 0 }
  for (let i = 0; i < index.toks.length; i++) {
    if (skip(i)) continue
    for (let len = Math.max(1, n - 1); len <= n + 1 && i + len <= index.toks.length; len++) {
      const got = index.toks.slice(i, i + len).map((k) => k.t).join('')
      const score = similarity(want, got)
      if (score > best.score) best = { score, from: i, to: i + len }
    }
  }
  return best
}
