import { describe, it, expect } from 'vitest'
import { findPanels } from '../src/ocr/panels.js'

// Builds a gray image: white with black "text" blocks.
function image(width, height, blocks) {
  const gray = new Uint8ClampedArray(width * height).fill(255)
  for (const [x0, x1] of blocks)
    for (let y = 20; y < height - 20; y += 6)
      for (let x = x0; x < x1; x++) gray[y * width + x] = 0
  return gray
}

describe('findPanels', () => {
  it('splits two labels at the blank gap', () => {
    const panels = findPanels(image(600, 200, [[20, 270], [330, 580]]), 600, 200)
    expect(panels).toHaveLength(2)
    expect(panels[0].x1).toBeGreaterThan(270)
    expect(panels[0].x1).toBeLessThan(330)
    expect(panels[1].x0).toBe(panels[0].x1)
  })
  it('keeps one panel when text runs across the middle', () => {
    expect(findPanels(image(600, 200, [[20, 580]]), 600, 200)).toEqual([{ x0: 0, x1: 600 }])
  })
  it('ignores a narrow gap near the edge', () => {
    expect(findPanels(image(600, 200, [[100, 580]]), 600, 200)).toEqual([{ x0: 0, x1: 600 }])
  })
})
