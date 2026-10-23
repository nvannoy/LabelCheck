import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { TOUR_STEPS } from '../src/tour/steps.js'
import { SAMPLE_READ, SAMPLE_TEXT } from '../src/tour/sample.js'
import { applicationFromText } from '../src/engine/parse.js'
import { checkLabel } from '../src/engine/check.js'

describe('tour steps', () => {
  it('has a welcome step first and a closing step last, with unique ids', () => {
    expect(TOUR_STEPS[0].id).toBe('welcome')
    expect(TOUR_STEPS[0].target).toBeNull()
    expect(TOUR_STEPS.at(-1).id).toBe('done')
    expect(new Set(TOUR_STEPS.map((s) => s.id)).size).toBe(TOUR_STEPS.length)
  })
  it('gives every step a title, plain text and a screen', () => {
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(3)
      expect(s.text.length).toBeGreaterThan(20)
      expect(['intake', 'review']).toContain(s.screen)
      expect(`${s.title} ${s.text}`).not.toMatch(/—/) // no em-dashes in UI copy
    }
  })
  it('only opens fields that exist', () => {
    const ids = ['brand', 'classType', 'abv', 'netContents', 'bottler', 'country', 'warning']
    for (const s of TOUR_STEPS) if (s.focus) expect(ids).toContain(s.focus)
  })
  it('does not store anything', () => {
    for (const f of ['src/tour/Tour.jsx', 'src/tour/steps.js', 'src/tour/sample.js']) {
      expect(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(/)
    }
  })
})

describe('tour sample label', () => {
  const { application, found } = applicationFromText(SAMPLE_TEXT)
  const result = checkLabel({ words: SAMPLE_READ.words, application, quality: SAMPLE_READ.quality })
  it('has application text the parser reads in full', () => {
    expect(found).toBe(6)
    expect(application.imported).toBe(false)
  })
  it('shows a Likely reject with exactly one mismatch, net contents, and the rest matching', () => {
    expect(result.tier).toBe('reject')
    expect(result.counts.mismatch).toBe(1)
    expect(result.fields.find((f) => f.id === 'netContents').status).toBe('mismatch')
    for (const id of ['brand', 'classType', 'abv', 'bottler', 'warning']) expect(result.fields.find((f) => f.id === id).status).toBe('match')
  })
  it('locates every field for the boxes on the label', () => {
    for (const f of result.fields) if (f.status !== 'na') expect(f.bbox).toBeTruthy()
  })
  it('uses a fictional brand', () => {
    expect(SAMPLE_TEXT).toMatch(/Cedar Fork/)
  })
})
