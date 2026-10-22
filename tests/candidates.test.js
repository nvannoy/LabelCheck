import { describe, it, expect } from 'vitest'
import { missingRequired, hasAbvCandidate, hasNetContentsCandidate } from '../src/engine/candidates.js'

describe('candidates', () => {
  it('finds alcohol content in common forms', () => {
    for (const t of ['45% Alc./Vol.', 'Alcohol 40% by volume', '5% ALC./VOL.', '12.5 percent alcohol']) expect(hasAbvCandidate(t)).toBe(true)
  })
  it('does not treat a proof statement as a percentage', () => {
    expect(hasAbvCandidate('94 Proof')).toBe(false)
  })
  it('finds net contents in common forms', () => {
    for (const t of ['750 mL', '1 L', '1.75 L', '200 ML', '1 PINT, 0.9 FL. OZ.']) expect(hasNetContentsCandidate(t)).toBe(true)
  })
  it('reports what is missing', () => {
    expect(missingRequired('Silver Pike Vodka 40% Alc./Vol. 1 L')).toEqual([])
    expect(missingRequired('Silver Pike Vodka 1 L')).toEqual(['abv'])
    expect(missingRequired('Vodka 40% 1 L', { brand: "Pike's Bend" })).toEqual(['brand'])
  })
  it('ignores case, spacing and apostrophes for brand and class', () => {
    expect(missingRequired('PIKES BEND vodka 40% 1 L', { brand: "Pike’s Bend", classType: 'Vodka' })).toEqual([])
  })
})
