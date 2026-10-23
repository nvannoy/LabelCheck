import { describe, it, expect } from 'vitest'
import { checkWarning, WARNING_TEXT } from '../src/engine/warning.js'
import { checkLabel, qualityProblems } from '../src/engine/check.js'
import { FIELDS } from '../src/engine/fields.js'
import { parseAbv, parseNetContents } from '../src/engine/parse.js'
import { similarity } from '../src/engine/text.js'
import { wordsFrom, APP } from './engine-helpers.js'

const LABEL = `HARLAN RIDGE ${APP.classType} 45% Alc./Vol. (90 Proof) 750 mL Bottled by ${APP.bottler} ${WARNING_TEXT}`
const status = (text, app = APP, quality) => Object.fromEntries(checkLabel({ words: wordsFrom(text), application: app, quality }).fields.map((f) => [f.id, f.status]))

describe('parsers', () => {
  it('reads percentages and ignores proof', () => {
    expect(parseAbv('45% Alc./Vol. (90 Proof)').map((a) => a.value)).toEqual([45])
    expect(parseAbv('94 Proof')).toEqual([])
  })
  it('converts net contents to millilitres', () => {
    expect(parseNetContents('750 mL')[0].ml).toBe(750)
    expect(parseNetContents('75 cl')[0].ml).toBe(750)
    expect(parseNetContents('1.75 L')[0].ml).toBe(1750)
    expect(parseNetContents('1 Pint')[0].ml).toBe(473.2)
  })
})

describe('similarity', () => {
  it('is 1 for identical and lower for different text', () => {
    expect(similarity('abc', 'abc')).toBe(1)
    expect(similarity('hollow', 'hallow')).toBeCloseTo(0.83, 1)
  })
})

describe('government warning', () => {
  const check = (text, conf) => checkWarning(wordsFrom(text, conf))
  it('matches the exact statutory text', () => {
    expect(check(WARNING_TEXT).status).toBe('match')
  })
  it('ignores line breaks and extra spaces', () => {
    expect(check(WARNING_TEXT.replace(/ /g, '\n  ')).status).toBe('match')
  })
  it('flags a changed word as a mismatch', () => {
    const r = check(WARNING_TEXT.replace('car', 'truck'))
    expect(r.status).toBe('mismatch')
    expect(r.reason).toContain('truck')
  })
  it('flags a title that is not all capitals', () => {
    expect(check(WARNING_TEXT.replace('GOVERNMENT WARNING:', 'Government Warning:')).status).toBe('mismatch')
  })
  it('flags swapped clauses', () => {
    const swapped = 'GOVERNMENT WARNING: (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems. (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects.'
    expect(check(swapped).status).toBe('mismatch')
  })
  it('sends a missing clause to review, never a pass', () => {
    expect(check(WARNING_TEXT.split(' (2)')[0]).status).toBe('check')
  })
  it('sends low-confidence differences to review instead of calling them wrong', () => {
    expect(check(WARNING_TEXT.replace('women', 'wonjen'), 60).status).toBe('check')
  })
  it('sends differences in punctuation only to review', () => {
    expect(check(WARNING_TEXT.replace('defects.', 'defects')).status).toBe('check')
  })
  it('sends an all-capitals body to review', () => {
    expect(check(WARNING_TEXT.toUpperCase()).status).toBe('check')
  })
  it('sends a missing warning to review', () => {
    expect(check('Harlan Ridge Bourbon 45% 750 mL').status).toBe('check')
  })
  it('always asks the agent to check bold type and size', () => {
    expect(check(WARNING_TEXT).byEye.join(' ')).toMatch(/bold/i)
    expect(check(WARNING_TEXT).byEye.join(' ')).toMatch(/size/i)
  })
})

describe('field checks', () => {
  it('passes a clean label', () => {
    const s = status(LABEL)
    expect(Object.values(s).every((v) => v === 'match' || v === 'na')).toBe(true)
    expect(s.country).toBe('na')
  })
  it('treats brand case and apostrophes as a match', () => {
    expect(status(LABEL.replace('HARLAN RIDGE', 'harlan ridge')).brand).toBe('match')
    expect(status('STONES THROW 40% 750 mL', { ...APP, brand: "Stone’s Throw" }).brand).toBe('match')
  })
  it('does not accept the brand from the bottler line', () => {
    expect(status(LABEL.replace('HARLAN RIDGE', 'Hollow Creek')).brand).not.toBe('match')
  })
  it('flags a wrong ABV and a wrong net contents', () => {
    expect(status(LABEL.replace('45%', '40%')).abv).toBe('mismatch')
    expect(status(LABEL.replace('750 mL', '700 mL')).netContents).toBe('mismatch')
  })
  it('accepts equal net contents in other units and spellings', () => {
    expect(status(LABEL.replace('750 mL', '75 cl')).netContents).toBe('match')
    expect(status(LABEL.replace('750 mL', '750 ML')).netContents).toBe('match')
  })
  it('sends missing fields to review', () => {
    expect(status(LABEL.replace('45% Alc./Vol. (90 Proof)', '')).abv).toBe('check')
    expect(status(LABEL.replace('750 mL', '')).netContents).toBe('check')
  })
  it('never calls a different bottler a match', () => {
    expect(status(LABEL.replace('Bardstown, KY', 'Duluth, WI')).bottler).toBe('check')
  })
  it('needs the country of origin only for imports', () => {
    const imp = { ...APP, imported: true, country: 'Mexico' }
    expect(status(`${LABEL} Product of Mexico`, imp).country).toBe('match')
    expect(status(`${LABEL} Product of Spain`, imp).country).toBe('mismatch')
    expect(status(LABEL, imp).country).toBe('check')
  })
  it('downgrades matches when the image is small or pale', () => {
    expect(status(LABEL, APP, { width: 450, contrastSpan: 200 }).brand).toBe('check')
    expect(status(LABEL, APP, { width: 900, contrastSpan: 54 }).abv).toBe('check')
    expect(qualityProblems({ width: 900, contrastSpan: 200 })).toEqual([])
  })
  it('never reports ready when any field is not a match', () => {
    const r = checkLabel({ words: wordsFrom(LABEL.replace('45%', '40%')), application: APP })
    expect(r.overall).toBe('not-ready')
    expect(r.counts.mismatch).toBe(1)
  })
  it('has one config entry per field with a rule sentence', () => {
    expect(FIELDS.map((f) => f.id)).toEqual(['brand', 'classType', 'abv', 'netContents', 'bottler', 'country', 'warning'])
    for (const f of FIELDS) expect(f.rule.length).toBeGreaterThan(20)
  })
})
