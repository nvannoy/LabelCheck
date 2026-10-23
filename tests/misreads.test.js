import { describe, it, expect } from 'vitest'
import { checkWarning, WARNING_TEXT } from '../src/engine/warning.js'
import { checkLabel } from '../src/engine/check.js'
import { wordsFrom, APP } from './engine-helpers.js'

const warning = (text) => checkWarning(wordsFrom(text))
const upper = WARNING_TEXT.toUpperCase()

describe('clause marker misread as a letter', () => {
  for (const mark of ['(I)', '(l)', '(|)']) {
    it(`sends ${mark} for (1) to review with a plain reason, never a match`, () => {
      const r = warning(upper.replace('(1)', mark))
      expect(r.status).toBe('check')
      expect(r.reason).toBe('Clause marker looks like (I) or (l). Confirm it reads (1) by eye.')
    })
  }
  it('still calls a wording difference elsewhere a mismatch', () => {
    const r = warning(upper.replace('(1)', '(I)').replace('SURGEON', 'DOCTOR'))
    expect(r.status).toBe('mismatch')
    expect(r.reason).toContain('"DOCTOR" where the statute has "Surgeon"')
  })
  it('does not apply to other digits', () => {
    expect(warning(upper.replace('(2)', '(I)')).status).toBe('mismatch')
  })
  it('names the first real difference in an all-caps body', () => {
    const r = warning(upper.replace('WOMEN', 'WOMER').replace('RISK', 'RINK'))
    expect(r.status).toBe('mismatch')
    expect(r.reason).toBe('The wording differs from the statute: "WOMER" where the statute has "women" (and 1 more).')
  })
})

describe('country of origin read', () => {
  const imp = (country, label) => checkLabel({
    words: wordsFrom(`HARLAN RIDGE ${APP.classType} 45% Alc./Vol. 750 mL ${label} ${WARNING_TEXT}`),
    application: { ...APP, imported: true, country },
  }).fields.find((f) => f.id === 'country')
  it('keeps Mismatch for a real, different country', () => {
    const r = imp('Canada', 'Product of Mexico')
    expect(r.status).toBe('mismatch')
    expect(r.reason).toBe('The label names "mexico" but the application says Canada.')
  })
  it('keeps Mismatch for a two-word country', () => {
    expect(imp('Canada', 'Product of New Zealand').status).toBe('mismatch')
  })
  it('sends an unreadable country to review', () => {
    const r = imp('Canada', 'PRODUCED IN N CANAD,')
    expect(r.status).toBe('check')
    expect(r.reason).toBe('Could not read the country clearly. Confirm by eye.')
  })
  it('still matches the application country', () => {
    expect(imp('Canada', 'Product of Canada').status).toBe('match')
  })
})
