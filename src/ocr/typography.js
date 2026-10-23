// Measures the government warning's type from the image, to help the agent.
// Pure functions on grayscale pixels, so they run in the browser and in Node.
//
// Boldness is a comparison inside the warning: stroke thickness of the title
// ("GOVERNMENT WARNING:") against the rest, each as a share of letter height.
// Type size and characters per inch need a real-world scale, which a picture
// does not carry, so they need the label width in inches from the agent.
// Everything here is an estimate. It can make a result worse (send it to
// Needs review) but never better; see 27 CFR 16.22 for the limits.

// Calibrated on the generated test labels (five font families): real bold titles
// measured 1.15 to 1.49, a regular-weight title 1.06, an all-bold warning 0.89.
// The small TTB samples (letters about 12 px tall) gave unreliable numbers, so
// boldness is not judged below MIN_LETTER_PX.
const BOLD_RATIO = 1.12 // title strokes at least this much thicker than the body: bold
const NOT_BOLD_RATIO = 1.08 // at most this much: the title is not bolder than the body
const MIN_LETTER_PX = 14 // below this, strokes blur together and boldness cannot be judged
const X_HEIGHT_OF_CAP = 0.7 // typical lowercase height as a share of capital height

// 27 CFR 16.22(b) and (a)(4): minimum type size and the matching maximum characters per inch.
export function limitsFor(containerMl) {
  if (!containerMl || containerMl <= 237) return { minMm: 1, maxCpi: 40, tier: containerMl ? 'a container of 237 mL or less' : 'an unknown container size (assuming 237 mL or less)' }
  if (containerMl <= 3000) return { minMm: 2, maxCpi: 25, tier: 'a container over 237 mL and up to 3 L' }
  return { minMm: 3, maxCpi: 12, tier: 'a container over 3 L' }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null
}

function otsu(values) {
  const hist = new Array(256).fill(0)
  for (const v of values) hist[v]++
  const total = values.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let wB = 0, sumB = 0, best = 0, threshold = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += t * hist[t]
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2
    if (between > best) { best = between; threshold = t }
  }
  return threshold
}

// Ink area and edge length inside one box. Thickness of a stroke is 2 x area / edge length.
function inkSums(gray, gw, gh, box) {
  const x0 = Math.max(0, Math.floor(box.x0)), y0 = Math.max(0, Math.floor(box.y0))
  const x1 = Math.min(gw, Math.ceil(box.x1)), y1 = Math.min(gh, Math.ceil(box.y1))
  const w = x1 - x0, h = y1 - y0
  if (w < 3 || h < 3) return null
  const values = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) values[y * w + x] = gray[(y0 + y) * gw + x0 + x]
  const t = otsu(values)
  let dark = 0
  for (const v of values) if (v <= t) dark++
  const inkIsDark = dark <= values.length - dark // the smaller class is the text
  const ink = (i) => (values[i] <= t) === inkIsDark
  let area = 0, edge = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!ink(i)) continue
      area++
      if (x === 0 || !ink(i - 1)) edge++
      if (x === w - 1 || !ink(i + 1)) edge++
      if (y === 0 || !ink(i - w)) edge++
      if (y === h - 1 || !ink(i + w)) edge++
    }
  }
  return { area, edge }
}

// Stroke thickness over a group of words, in pixels of `gray`.
export function strokeThickness(gray, gw, gh, boxes) {
  let area = 0, edge = 0
  for (const b of boxes) {
    const s = inkSums(gray, gw, gh, b)
    if (s) { area += s.area; edge += s.edge }
  }
  return edge ? (2 * area) / edge : null
}

export function describeBold(words, gray, gw, gh, scale, reliable = true) {
  const title = words.slice(0, 2)
  const body = words.slice(2)
  const box = (w) => ({ x0: w.bbox.x0 * scale, y0: w.bbox.y0 * scale, x1: w.bbox.x1 * scale, y1: w.bbox.y1 * scale })
  const titleH = median(title.map((w) => w.bbox.y1 - w.bbox.y0))
  const bodyH = median(body.filter((w) => !/[gjpqy,;]/.test(w.text)).map((w) => w.bbox.y1 - w.bbox.y0)) ?? median(body.map((w) => w.bbox.y1 - w.bbox.y0))
  if (!reliable) return { status: 'unclear', text: 'The image is small or has low contrast, so boldness cannot be judged from it.' }
  if (!title.length || !body.length || titleH < MIN_LETTER_PX) {
    return { status: 'unclear', text: 'The letters are too small in this image to tell whether the title is bold.' }
  }
  const tw = strokeThickness(gray, gw, gh, title.map(box))
  const bw = strokeThickness(gray, gw, gh, body.map(box))
  if (!tw || !bw) return { status: 'unclear', text: 'The letters could not be measured in this image.' }
  const ratio = (tw / (titleH * scale)) / (bw / (bodyH * scale))
  const r = Math.round(ratio * 100) / 100
  if (ratio >= BOLD_RATIO) return { status: 'bold', ratio: r, text: `The title strokes are ${r} times as thick as the rest, so "GOVERNMENT WARNING:" looks bold and the rest does not.` }
  if (ratio <= NOT_BOLD_RATIO) return { status: 'not-bold', ratio: r, text: `The title strokes are about as thick as the rest (${r} times), so the title does not look bolder than the body.` }
  return { status: 'unclear', ratio: r, text: `The title is a little thicker than the rest (${r} times). That is not clear enough to call.` }
}

// Lowercase height from words that rise to capital height but do not drop below the line.
export function estimateXHeightPx(words) {
  const tall = words.slice(2).filter((w) => /[A-Zbdfhklt0-9]/.test(w.text) && !/[gjpqy,;]/.test(w.text))
  const h = median(tall.map((w) => w.bbox.y1 - w.bbox.y0))
  return h ? h * X_HEIGHT_OF_CAP : null
}

// Highest characters-per-inch over the full lines of the statement.
export function charactersPerInch(words, pxPerInch) {
  const heights = words.map((w) => w.bbox.y1 - w.bbox.y0)
  const lineH = median(heights) ?? 1
  const lines = []
  for (const w of [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0)) {
    const cy = (w.bbox.y0 + w.bbox.y1) / 2
    const line = lines.find((l) => Math.abs(l.cy - cy) < lineH * 0.6)
    if (line) { line.words.push(w); line.cy = (line.cy * (line.words.length - 1) + cy) / line.words.length }
    else lines.push({ cy, words: [w] })
  }
  let best = null
  for (const l of lines.filter((x) => x.words.length >= 5)) {
    const chars = l.words.reduce((a, w) => a + w.text.length, 0) + l.words.length - 1
    const inches = (Math.max(...l.words.map((w) => w.bbox.x1)) - Math.min(...l.words.map((w) => w.bbox.x0))) / pxPerInch
    if (inches > 0) best = Math.max(best ?? 0, chars / inches)
  }
  return best
}

// pxPerInch is the image's pixels per inch for the label that carries the warning,
// or null when the label width is not known.
export function describeSize(words, { pxPerInch, containerMl }) {
  const { minMm, maxCpi, tier } = limitsFor(containerMl)
  if (!pxPerInch) {
    return {
      size: { status: 'unknown', minMm, text: `To measure type size, enter the label width in inches. The minimum is ${minMm} mm for ${tier}.` },
      cpi: { status: 'unknown', maxCpi, text: `To measure characters per inch, enter the label width. The maximum is ${maxCpi} for ${tier}.` },
    }
  }
  const xh = estimateXHeightPx(words)
  const mm = xh ? (xh / pxPerInch) * 25.4 : null
  let size
  if (mm === null) size = { status: 'unknown', minMm, text: 'The lowercase letters could not be measured.' }
  else {
    const m = Math.round(mm * 10) / 10
    const status = mm >= minMm * 1.1 ? 'ok' : mm >= minMm * 0.85 ? 'close' : 'small'
    size = {
      status, mm: m, minMm,
      text: status === 'ok' ? `The smallest letters measure about ${m} mm. The minimum is ${minMm} mm for ${tier}.`
        : status === 'close' ? `The smallest letters measure about ${m} mm, close to the ${minMm} mm minimum for ${tier}. The estimate is only good to about 20%, so measure it by hand.`
          : `The smallest letters measure about ${m} mm. The minimum is ${minMm} mm for ${tier}.`,
    }
  }
  const cpiValue = charactersPerInch(words, pxPerInch)
  let cpi
  if (cpiValue === null) cpi = { status: 'unknown', maxCpi, text: 'The lines could not be measured.' }
  else {
    const c = Math.round(cpiValue)
    const status = cpiValue <= maxCpi * 0.9 ? 'ok' : cpiValue <= maxCpi * 1.15 ? 'close' : 'high'
    cpi = {
      status, value: c, maxCpi,
      text: status === 'ok' ? `The longest line has about ${c} characters per inch. The maximum is ${maxCpi}.`
        : status === 'close' ? `The longest line has about ${c} characters per inch, close to the maximum of ${maxCpi}. Check it by hand.`
          : `The longest line has about ${c} characters per inch. The maximum is ${maxCpi}.`,
    }
  }
  return { size, cpi }
}

// Gray is the warning area at `scale` times the original size.
export function analyzeType({ gray, gw, gh, scale, words, pxPerInch, containerMl, reliable = true }) {
  const bold = describeBold(words, gray, gw, gh, scale, reliable)
  const { size, cpi } = describeSize(words, { pxPerInch, containerMl })
  // Only clear failures count. Unclear and close results stay for the agent.
  const failing = bold.status === 'not-bold' || size.status === 'small' || cpi.status === 'high'
  return { bold, size, cpi, needsScale: !pxPerInch, failing }
}
