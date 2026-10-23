// Finds side-by-side labels in one image (for example a brand label and a back
// label next to each other) by looking for a blank vertical gap between them.
// Pure functions on pixel arrays, so they run in the browser and in Node.

const INK_DIFF = 35 // gray levels away from the column's average that count as ink
const INK_SHARE = 0.01 // a column with less ink than this is blank
const MIN_PANEL_SHARE = 0.25 // each panel must be at least this share of the width
const MIN_GAP_SHARE = 0.012

export function toGray(rgba, width, height) {
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < gray.length; i++)
    gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]
  return gray
}

function blankColumns(gray, width, height) {
  const blank = new Array(width).fill(false)
  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let y = 0; y < height; y++) sum += gray[y * width + x]
    const mean = sum / height
    let ink = 0
    for (let y = 0; y < height; y++) if (Math.abs(gray[y * width + x] - mean) > INK_DIFF) ink++
    blank[x] = ink / height < INK_SHARE
  }
  return blank
}

// Returns [{x0, x1}] panels left to right. One panel means no split.
export function findPanels(gray, width, height) {
  const blank = blankColumns(gray, width, height)
  const minGap = Math.max(6, Math.round(width * MIN_GAP_SHARE))
  const lo = Math.round(width * MIN_PANEL_SHARE)
  const hi = Math.round(width * (1 - MIN_PANEL_SHARE))

  let best = null
  let x = lo
  while (x < hi) {
    if (!blank[x]) { x++; continue }
    let start = x
    while (start > 0 && blank[start - 1]) start--
    let end = x
    while (end < width - 1 && blank[end + 1]) end++
    if (end - start + 1 >= minGap && (!best || end - start > best.end - best.start)) best = { start, end }
    x = end + 1
  }
  if (!best) return [{ x0: 0, x1: width }]
  const mid = Math.round((best.start + best.end) / 2)
  return [{ x0: 0, x1: mid }, { x0: mid, x1: width }]
}

// Gray levels between the darkest 1% and the lightest 1% of pixels. A pale-on-pale
// label has a small span, which the engine reports as low contrast.
export function contrastSpan(gray) {
  const hist = new Array(256).fill(0)
  for (let i = 0; i < gray.length; i++) hist[gray[i] | 0]++
  const tail = gray.length * 0.01
  let lo = 0, hi = 255, acc = 0
  while (lo < 255 && (acc += hist[lo]) < tail) lo++
  acc = 0
  while (hi > 0 && (acc += hist[hi]) < tail) hi--
  return hi - lo
}
