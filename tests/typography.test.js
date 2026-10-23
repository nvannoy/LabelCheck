import { describe, it, expect } from 'vitest'
import { strokeThickness, describeBold, describeSize, charactersPerInch, limitsFor, estimateXHeightPx, analyzeType } from '../src/ocr/typography.js'

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

describe('limits (27 CFR 16.22)', () => {
  it('follows the container size', () => {
    expect(limitsFor(200)).toMatchObject({ minMm: 1, maxCpi: 40 })
    expect(limitsFor(750)).toMatchObject({ minMm: 2, maxCpi: 25 })
    expect(limitsFor(1750)).toMatchObject({ minMm: 2, maxCpi: 25 })
    expect(limitsFor(3785)).toMatchObject({ minMm: 3, maxCpi: 12 })
  })
})

describe('size and characters per inch', () => {
  // 10 words of 5 letters on one line: 59 characters across 590 px.
  const line = Array.from({ length: 10 }, (_, i) => word('Tests', i * 59, 100, i * 59 + 50, 130))
  const words = [word('GOVERNMENT', 0, 10, 80, 40), word('WARNING:', 90, 10, 170, 40), ...line]
  it('computes characters per inch from the line width', () => {
    expect(charactersPerInch(line, 100)).toBeCloseTo(59 / 5.9, 0)
  })
  it('estimates lowercase height from taller words without descenders', () => {
    expect(estimateXHeightPx(words)).toBeCloseTo(30 * 0.7, 5)
  })
  it('asks for the label width when the scale is unknown', () => {
    const r = describeSize(words, { pxPerInch: null, containerMl: 750 })
    expect(r.size.status).toBe('unknown')
    expect(r.size.text).toMatch(/enter the label width/)
  })
  it('judges size against the minimum for the container', () => {
    // 21 px of lowercase at 254 px per inch is 2.1 mm.
    expect(describeSize(words, { pxPerInch: 254, containerMl: 750 }).size.status).toBe('close')
    expect(describeSize(words, { pxPerInch: 200, containerMl: 750 }).size.status).toBe('ok')
    expect(describeSize(words, { pxPerInch: 400, containerMl: 750 }).size.status).toBe('small')
  })
  it('flags too many characters per inch', () => {
    expect(describeSize(words, { pxPerInch: 400, containerMl: 750 }).cpi.status).toBe('high')
    expect(describeSize(words, { pxPerInch: 100, containerMl: 750 }).cpi.status).toBe('ok')
  })
})

describe('analyzeType', () => {
  it('only counts clear failures', () => {
    const gray = new Uint8Array(10 * 10).fill(255)
    const words = [word('GOVERNMENT', 0, 0, 5, 5), word('WARNING:', 0, 0, 5, 5)]
    const r = analyzeType({ gray, gw: 10, gh: 10, scale: 1, words, pxPerInch: null, containerMl: 750 })
    expect(r.needsScale).toBe(true)
    expect(r.failing).toBe(false)
  })
})
