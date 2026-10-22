import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { generated, samples, WARNING } from '../scripts/label-specs.js'

const results = JSON.parse(readFileSync(new URL('./expected-results.json', import.meta.url), 'utf8'))

describe('label test set', () => {
  it('has 28 generated labels and 2 TTB samples', () => {
    expect(generated).toHaveLength(28)
    expect(samples).toHaveLength(2)
    expect(results).toHaveLength(30)
  })

  it('has unique ids', () => {
    const ids = results.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps expected-results.json in sync with the specs', () => {
    expect(results.map((r) => r.id)).toEqual([...generated, ...samples].map((s) => s.id))
  })

  it('has every sample image on disk', () => {
    for (const s of samples) expect(existsSync(new URL(`../${s.file}`, import.meta.url))).toBe(true)
  })

  it('marks overall ready only when every field matches', () => {
    for (const r of results) {
      const ok = Object.values(r.expected.fields).every((s) => s === 'match' || s === 'na')
      expect(r.expected.overall).toBe(ok ? 'ready' : 'not-ready')
    }
  })

  it('keeps clean labels clean and defect labels defective', () => {
    for (const r of results.filter((x) => x.id.startsWith('c0'))) expect(r.expected.overall).toBe('ready')
    for (const r of results.filter((x) => /^[dq]/.test(x.id))) expect(r.expected.overall).toBe('not-ready')
  })

  it('uses the statutory warning text on clean labels', () => {
    expect(generated[0].label.warning).toBe(WARNING)
  })
})
