import { describe, it, expect } from 'vitest'
import { placePin } from '../src/ui/pins.js'

const word = (x0, y0, x1, y1) => ({ bbox: { x0, y0, x1, y1 } })
const image = { width: 400, height: 400 }
const box = { x0: 100, y0: 100, x1: 200, y1: 130 }

describe('placePin', () => {
  it('uses the top-left spot when it is clear', () => {
    const p = placePin(box, 20, [word(100, 100, 200, 130)], image)
    expect(p.x).toBeLessThan(100)
    expect(p.y).toBe(80)
  })
  it('moves aside when the top-left spot would cover a word', () => {
    const words = [word(100, 100, 200, 130), word(60, 70, 98, 98)] // text just above-left of the box
    const p = placePin(box, 20, words, image)
    const rect = { x0: p.x, y0: p.y, x1: p.x + 20, y1: p.y + 20 }
    for (const w of words) {
      const overlap = Math.min(rect.x1, w.bbox.x1) > Math.max(rect.x0, w.bbox.x0) && Math.min(rect.y1, w.bbox.y1) > Math.max(rect.y0, w.bbox.y0)
      expect(overlap).toBe(false)
    }
  })
  it('never covers the words inside its own box', () => {
    const p = placePin(box, 20, [word(100, 100, 200, 130)], image)
    const inside = p.x + 20 > 100 && p.x < 200 && p.y + 20 > 100 && p.y < 130
    expect(inside).toBe(false)
  })
  it('picks the least bad spot when every spot touches text', () => {
    const wall = [word(0, 0, 400, 400)]
    expect(placePin(box, 20, wall, image)).toBeTruthy()
  })
})
