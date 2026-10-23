// Measures whether the government warning's title is bold, to help the agent.
// Pure functions on grayscale pixels, so they run in the browser and in Node.
//
// Boldness is a comparison inside the warning: stroke thickness of the title
// ("GOVERNMENT WARNING:") against the rest, each as a share of letter height.
// It needs no real-world scale. Type size and characters per inch (27 CFR 16.22)
// cannot be measured: the image carries no scale and the application data has
// none either. The estimate can make a result worse (send it to Needs review)
// but never better.

// Calibrated on the generated test labels (five font families): real bold titles
// measured 1.15 to 1.49, a regular-weight title 1.06, an all-bold warning 0.89.
// The small TTB samples (letters about 12 px tall) gave unreliable numbers, so
// boldness is not judged below MIN_LETTER_PX.
const BOLD_RATIO = 1.12 // title strokes at least this much thicker than the body: bold
const NOT_BOLD_RATIO = 1.08 // at most this much: the title is not bolder than the body
const MIN_LETTER_PX = 14 // below this, strokes blur together and boldness cannot be judged

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

// Gray is the warning area at `scale` times the original size.
export function analyzeType({ gray, gw, gh, scale, words, reliable = true }) {
  const bold = describeBold(words, gray, gw, gh, scale, reliable)
  // Only a clear failure counts. "Cannot tell" stays for the agent.
  return { bold, failing: bold.status === 'not-bold' }
}
