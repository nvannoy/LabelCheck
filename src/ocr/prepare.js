// Image preparation before OCR. Small labels are upscaled because Tesseract
// reads text under about 20 px tall poorly. makeCanvas is passed in so the
// same code runs in the browser and in Node (evaluation script).

const TARGET_WIDTH = 1800 // upscale small images to about this width
const MAX_SCALE = 4

export function pickScale(width) {
  return Math.min(MAX_SCALE, Math.max(1, TARGET_WIDTH / width))
}

// Stretches the grayscale range so pale text on pale backgrounds gains contrast.
// With invert, light text on a dark background becomes dark text on a light one.
export function grayscaleStretch(pixels, invert = false) {
  const gray = new Uint8ClampedArray(pixels.length / 4)
  let lo = 255, hi = 0
  for (let i = 0; i < gray.length; i++) {
    const g = 0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2]
    gray[i] = g
    if (g < lo) lo = g
    if (g > hi) hi = g
  }
  const span = Math.max(1, hi - lo)
  for (let i = 0; i < gray.length; i++) {
    const v = ((gray[i] - lo) * 255) / span
    pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = invert ? 255 - v : v
    pixels[i * 4 + 3] = 255
  }
  return pixels
}

// crop is {x, y, w, h} in source pixels. Returns the canvas and the scale used,
// so callers can map word positions back to source pixels.
export function prepare(source, width, height, makeCanvas, { scale, gray = true, invert = false, crop } = {}) {
  const c = crop ?? { x: 0, y: 0, w: width, h: height }
  const s = scale ?? pickScale(c.w)
  const canvas = makeCanvas(Math.round(c.w * s), Math.round(c.h * s))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, c.x, c.y, c.w, c.h, 0, 0, canvas.width, canvas.height)
  if (gray || invert) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    grayscaleStretch(img.data, invert)
    ctx.putImageData(img, 0, 0)
  }
  return { canvas, scale: s }
}
