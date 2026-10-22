import { describe, it, expect } from 'vitest'
import { pickScale, grayscaleStretch } from '../src/ocr/prepare.js'

describe('pickScale', () => {
  it('upscales small images toward the target width', () => {
    expect(pickScale(609)).toBeCloseTo(2.96, 1)
  })
  it('caps the scale', () => {
    expect(pickScale(100)).toBe(4)
  })
  it('never shrinks large images', () => {
    expect(pickScale(3000)).toBe(1)
  })
})

describe('grayscaleStretch', () => {
  it('stretches a pale range to full black and white', () => {
    const px = new Uint8ClampedArray([200, 200, 200, 255, 230, 230, 230, 255])
    grayscaleStretch(px)
    expect([px[0], px[4]]).toEqual([0, 255])
  })
  it('inverts when asked, so light text becomes dark', () => {
    const px = new Uint8ClampedArray([40, 40, 40, 255, 240, 240, 240, 255])
    grayscaleStretch(px, true)
    expect([px[0], px[4]]).toEqual([255, 0])
  })
})
