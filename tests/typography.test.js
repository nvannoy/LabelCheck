import { describe, it, expect } from 'vitest'
import { strokeThickness, describeBold, analyzeType } from '../src/ocr/typography.js'

// A white image with black vertical bars: a stand-in for letter strokes.
function bars(gw, gh, regions) {
  const gray = new Uint8Array(gw * gh).fill(255)
  for (const r of regions) {
    for (let x = r.x0; x + r.barW <= r.x1; x += r.barW * 3) {
      for (let y = r.y0; y < r.y1; y++) for (let k = 0; k < r.barW; k++) gray[y * gw + x + k] = 0
    }
  }
  return gray
}
const word = (text, x0, y0, x1, y1) => ({ text, bbox: { x0, y0, x1, y1 } })

describe('strokeThickness', () => {
  it('is larger for thicker strokes and close to the stroke width', () => {
    const gray = bars(200, 100, [{ x0: 0, x1: 90, y0: 10, y1: 60, barW: 3 }, { x0: 100, x1: 190, y0: 10, y1: 60, barW: 6 }])
    const thin = strokeThickness(gray, 200, 100, [{ x0: 0, y0: 5, x1: 95, y1: 65 }])
    const thick = strokeThickness(gray, 200, 100, [{ x0: 100, y0: 5, x1: 195, y1: 65 }])
    expect(thin).toBeGreaterThan(2)
    expect(thin).toBeLessThan(3.2)
    expect(thick / thin).toBeGreaterThan(1.7)
  })
})

describe('describeBold', () => {
  const title = [word('GOVERNMENT', 0, 10, 90, 60), word('WARNING:', 100, 10, 190, 60)]
  const body = [word('According', 0, 70, 90, 120), word('to', 100, 70, 190, 120)]
  it('calls a clearly thicker title bold', () => {
    const gray = bars(200, 130, [{ x0: 0, x1: 190, y0: 10, y1: 60, barW: 6 }, { x0: 0, x1: 190, y0: 70, y1: 120, barW: 3 }])
    expect(describeBold([...title, ...body], gray, 200, 130, 1).status).toBe('bold')
  })
  it('says the title is not bolder when the strokes match', () => {
    const gray = bars(200, 130, [{ x0: 0, x1: 190, y0: 10, y1: 60, barW: 3 }, { x0: 0, x1: 190, y0: 70, y1: 120, barW: 3 }])
    expect(describeBold([...title, ...body], gray, 200, 130, 1).status).toBe('not-bold')
  })
  it('does not judge letters that are too small', () => {
    const small = [word('GOVERNMENT', 0, 10, 90, 20), word('WARNING:', 100, 10, 190, 20), ...body]
    const gray = bars(200, 130, [{ x0: 0, x1: 190, y0: 10, y1: 60, barW: 6 }])
    expect(describeBold(small, gray, 200, 130, 1).status).toBe('unclear')
  })
  it('does not judge when the image is unreliable', () => {
    const gray = bars(200, 130, [{ x0: 0, x1: 190, y0: 10, y1: 120, barW: 3 }])
    expect(describeBold([...title, ...body], gray, 200, 130, 1, false).status).toBe('unclear')
  })
})

describe('analyzeType', () => {
  const title = [word('GOVERNMENT', 0, 10, 90, 60), word('WARNING:', 100, 10, 190, 60)]
  const body = [word('According', 0, 70, 90, 120), word('to', 100, 70, 190, 120)]
  it('counts only a clear failure', () => {
    const same = bars(200, 130, [{ x0: 0, x1: 190, y0: 10, y1: 60, barW: 3 }, { x0: 0, x1: 190, y0: 70, y1: 120, barW: 3 }])
    expect(analyzeType({ gray: same, gw: 200, gh: 130, scale: 1, words: [...title, ...body] }).failing).toBe(true)
    const unsure = new Uint8Array(10 * 10).fill(255)
    expect(analyzeType({ gray: unsure, gw: 10, gh: 10, scale: 1, words: [word('GOVERNMENT', 0, 0, 5, 5), word('WARNING:', 0, 0, 5, 5)] }).failing).toBe(false)
  })
})
