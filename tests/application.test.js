import { describe, it, expect } from 'vitest'
import { parseApplication } from '../src/engine/parse.js'
import { checkLabel } from '../src/engine/check.js'
import { wordsFrom } from './engine-helpers.js'

const SAMPLE = `Brand Name: Old Tom Distillery
Class/Type: Kentucky Straight Bourbon Whiskey
Alcohol Content: 45% Alc./Vol. (90 Proof)
Net Contents: 700 mL
Applicant: Old Tom Distillery, 120 Main St., Bardstown, KY
Permit No.: DSP-KY-1234`

describe('parseApplication', () => {
  it('finds labeled fields and counts the rest as extra', () => {
    const r = parseApplication(SAMPLE)
    expect(r.found).toBe(5)
    expect(r.extra).toBe(1)
    expect(r.fields.brand).toBe('Old Tom Distillery')
    expect(r.fields.abv).toBe('45% Alc./Vol. (90 Proof)')
    expect(r.fields.bottler).toContain('Bardstown')
    expect(r.fields.country).toBeUndefined()
  })
  it('accepts other spellings and keeps colons inside values', () => {
    const r = parseApplication('class and type: Vodka\nABV: 40%\nCountry of Origin: Mexico\nname and address: Pike Co., Duluth: MN')
    expect(r.fields).toMatchObject({ classType: 'Vodka', abv: '40%', country: 'Mexico', bottler: 'Pike Co., Duluth: MN' })
  })
  it('ignores empty values and keeps the first of a repeated field', () => {
    const r = parseApplication('Brand Name:\nBrand: A\nBrand: B')
    expect(r.fields.brand).toBe('A')
    expect(r.extra).toBe(2)
  })
})

describe('missing application values', () => {
  it('sends a field with no application value to review instead of comparing', () => {
    const words = wordsFrom('Silver Pike Vodka 40% Alc./Vol. 1 L')
    const out = checkLabel({ words, application: { brand: 'Silver Pike', imported: false } })
    expect(out.fields.find((f) => f.id === 'abv').status).toBe('check')
    expect(out.overall).toBe('not-ready')
  })
})
