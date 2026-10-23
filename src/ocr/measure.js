// Measures the government warning's type from the image (see typography.js).
// Browser-specific parts (canvas) are passed in, as in read.js.
import { prepare } from './prepare.js'
import { analyzeType } from './typography.js'

const PAD = 6 // px around the warning so edge letters are whole

// statementWords: the warning's words from the engine, in whole-image pixels.
export function measureWarning({ source, width, height, makeCanvas, statementWords, quality }) {
  if (!statementWords?.length) return null
  const box = {
    x0: Math.max(0, Math.min(...statementWords.map((w) => w.bbox.x0)) - PAD),
    y0: Math.max(0, Math.min(...statementWords.map((w) => w.bbox.y0)) - PAD),
    x1: Math.min(width, Math.max(...statementWords.map((w) => w.bbox.x1)) + PAD),
    y1: Math.min(height, Math.max(...statementWords.map((w) => w.bbox.y1)) + PAD),
  }
  const crop = { x: box.x0, y: box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0 }
  const scale = Math.max(2, Math.min(4, 1600 / crop.w))
  const { canvas } = prepare(source, width, height, makeCanvas, { crop, scale, gray: true })
  const ctx = canvas.getContext('2d')
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const gray = new Uint8Array(canvas.width * canvas.height)
  for (let i = 0; i < gray.length; i++) gray[i] = px[i * 4]

  const words = statementWords.map((w) => ({
    text: w.text,
    bbox: { x0: w.bbox.x0 - crop.x, y0: w.bbox.y0 - crop.y, x1: w.bbox.x1 - crop.x, y1: w.bbox.y1 - crop.y },
  }))

  return analyzeType({
    gray, gw: canvas.width, gh: canvas.height, scale, words,
    // A small or pale image gives unreliable stroke measurements (see check.js for the same limits).
    reliable: !(quality && (quality.width < 500 || quality.contrastSpan < 100)),
  })
}
