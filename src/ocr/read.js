// Reads one label image: splits side-by-side panels, reads each panel on its
// own, and returns words with positions in whole-image pixels. Runs a second
// pass with inverted colors only when a required field has no candidate.
// The second pass is off by default: on the test set it never added a word and
// cost 1.4 to 2.6 s each time it ran (see README).
// Browser-specific parts (canvas, OCR worker) are passed in.
import { prepare, pickScale } from './prepare.js'
import { toGray, findPanels } from './panels.js'
import { missingRequired } from '../engine/candidates.js'

const joinText = (words) => words.map((w) => w.text).join(' ')
const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

// Word boxes come back in prepared-canvas pixels. Map them to source pixels.
function toSourceCoords(words, scale, crop, pass) {
  return words.map((w) => ({
    text: w.text,
    confidence: w.confidence,
    pass,
    bbox: {
      x0: Math.round(w.bbox.x0 / scale + crop.x),
      y0: Math.round(w.bbox.y0 / scale + crop.y),
      x1: Math.round(w.bbox.x1 / scale + crop.x),
      y1: Math.round(w.bbox.y1 / scale + crop.y),
    },
  }))
}

function overlaps(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  if (w <= 0 || h <= 0) return false
  const inter = w * h
  const smaller = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0))
  return inter / smaller > 0.3
}

export async function readLabel({ source, width, height, makeCanvas, recognize, application, secondPass = false, split = true }) {
  const t0 = performance.now()

  const full = makeCanvas(width, height)
  const fullCtx = full.getContext('2d')
  fullCtx.drawImage(source, 0, 0)
  const gray = toGray(fullCtx.getImageData(0, 0, width, height).data, width, height)
  // One scale for every panel, chosen from the whole image, so splitting does
  // not make the pixel count (and the read time) bigger than reading it whole.
  const wholeScale = pickScale(width)
  const panels = split ? findPanels(gray, width, height) : [{ x0: 0, x1: width }]

  const readPanel = async (panel, opts) => {
    const crop = { x: panel.x0, y: 0, w: panel.x1 - panel.x0, h: height }
    const { canvas, scale } = prepare(source, width, height, makeCanvas, { crop, scale: wholeScale, ...opts })
    return toSourceCoords(await recognize(canvas), scale, crop, opts.invert ? 2 : 1)
  }

  let words = []
  const panelWords = []
  for (const panel of panels) {
    const pw = await readPanel(panel, {})
    panelWords.push(pw)
    words = words.concat(pw)
  }
  const firstPassMs = performance.now() - t0

  const missing = missingRequired(joinText(words), application)
  const second = { ran: false, missing, added: 0, ms: 0 }
  if (secondPass && missing.length) {
    const t1 = performance.now()
    // The front panel is the one without the government warning. If every panel
    // has it, or there is only one panel, the first panel is re-read.
    let target = panels.findIndex((_, i) => !squash(joinText(panelWords[i])).includes('governmentwarning'))
    if (target < 0) target = 0
    const extra = await readPanel(panels[target], { invert: true })
    const fresh = extra.filter((w) => w.text.trim() && !words.some((o) => overlaps(o.bbox, w.bbox)))
    words = words.concat(fresh)
    Object.assign(second, { ran: true, added: fresh.length, ms: performance.now() - t1, panel: target })
  }

  return { words, panels, secondPass: second, firstPassMs, ms: performance.now() - t0 }
}
