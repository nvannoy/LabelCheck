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
  it('always asks the agent to check bold type and legibility when nothing was measured', () => {
    expect(check(WARNING_TEXT).byEye.join(' ')).toMatch(/bold/i)
    expect(check(WARNING_TEXT).byEye.join(' ')).toMatch(/readable/i)
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
    expect(r.tier).toBe('reject')
  })
  it('names the tier from the worst result', () => {
    const tier = (text) => checkLabel({ words: wordsFrom(text), application: APP }).tier
    expect(tier(LABEL)).toBe('ready')
    expect(tier(LABEL.replace('750 mL', ''))).toBe('review')
    expect(tier(LABEL.replace('45%', '40%').replace('750 mL', ''))).toBe('reject')
  })
  it('has one config entry per field with a rule sentence', () => {
    expect(FIELDS.map((f) => f.id)).toEqual(['brand', 'classType', 'abv', 'netContents', 'bottler', 'country', 'warning'])
    for (const f of FIELDS) expect(f.rule.length).toBeGreaterThan(20)
  })
})

describe('split names and repeated names', () => {
  const MALT = { ...APP, brand: 'Malt & Hop', bottler: 'Malt & Hop Brewery, Hyattsville, MD' }
  it('matches a bottler whose name and city are printed apart', () => {
    const s = status('Brewed and bottled by MALT & HOP BREWERY Honey Ale 5% Alc./Vol. 1 Pint HYATTSVILLE, MD', MALT)
    expect(s.bottler).toBe('match')
  })
  it('does not match when the name part is wrong, even if the city is right', () => {
    expect(status('Bottled by Hop & Malt Cellars HYATTSVILLE, MD 5% 1 Pint', MALT).bottler).toBe('check')
  })
  it('does not match a bottler found only in the brand line', () => {
    const app = { ...APP, brand: 'Copper Marsh', bottler: 'Copper Marsh Rum Works, Savannah, GA' }
    expect(status('Copper Marsh Rum 40% 750 mL Bottled by Marsh Island Rum Works, Savannah, GA', app).bottler).not.toBe('match')
  })
  it('uses the surer reading when a brand is printed twice', () => {
    const words = [...wordsFrom('MALT HOP,', 43), ...wordsFrom('Ale 5% 1 Pint'), ...wordsFrom('MALT & HOP', 95)]
    const out = checkLabel({ words, application: MALT })
    expect(out.fields.find((f) => f.id === 'brand').status).toBe('match')
  })
})

describe('stray marks from artwork inside the warning', () => {
  it('ignores unsure non-words and still matches', () => {
    const words = wordsFrom(WARNING_TEXT)
    words.splice(30, 0, { text: '\\', confidence: 28, bbox: { x0: 0, y0: 0, x1: 5, y1: 5 } }, { text: 'P;', confidence: 0, bbox: { x0: 0, y0: 0, x1: 5, y1: 5 } })
    const r = checkWarning(words)
    expect(r.status).toBe('match')
    expect(r.reason).toContain('2 stray marks')
  })
  it('does not drop a confident word', () => {
    const words = wordsFrom(WARNING_TEXT)
    words.splice(30, 0, { text: 'extra', confidence: 95, bbox: { x0: 0, y0: 0, x1: 5, y1: 5 } })
    expect(checkWarning(words).status).toBe('mismatch')
  })
  it('boxes only the warning words', () => {
    const words = [...wordsFrom(WARNING_TEXT), ...wordsFrom('Ale 5%')]
    const r = checkWarning(words)
    expect(r.bbox.x1).toBe(words.find((w) => w.text === 'problems.').bbox.x1)
  })
})

describe('bold measurement in the warning result', () => {
  const t = (status) => ({ bold: { status, text: `Bold: ${status}` }, failing: status === 'not-bold' })
  const run = (typography) => checkLabel({ words: wordsFrom(LABEL), application: APP, typography }).fields.find((f) => f.id === 'warning')
  it('sends a matching warning to review when the title is clearly not bold', () => {
    const w = run(t('not-bold'))
    expect(w.status).toBe('check')
    expect(w.reason).toContain('type looks wrong')
  })
  it('never improves a result and keeps the legibility item for the agent', () => {
    const w = run(t('bold'))
    expect(w.status).toBe('match')
    expect(w.byEye.join(' ')).toMatch(/readable/)
    expect(w.byEye.join(' ')).not.toMatch(/Bold type/)
  })
  it('keeps the bold item when the measurement cannot tell', () => {
    expect(run(t('unclear')).byEye.join(' ')).toMatch(/Bold type/)
  })
})
