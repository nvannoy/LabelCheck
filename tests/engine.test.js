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
  it('calls a whole missing clause a mismatch when the rest was read clearly', () => {
    const r = check(WARNING_TEXT.split(' (2)')[0])
    expect(r.status).toBe('mismatch')
    expect(r.reason).toMatch(/Clause \(2\)/)
    expect(check(WARNING_TEXT.replace(/\(1\).*? \(2\)/, '(2)')).status).toBe('mismatch')
  })
  it('sends a missing clause to review when the read was unsure', () => {
    expect(check(WARNING_TEXT.split(' (2)')[0], 60).status).toBe('check')
  })
  it('sends a difference in very small print to review, not a mismatch', () => {
    const tiny = wordsFrom(WARNING_TEXT.replace('car', 'truck')).map((w) => ({ ...w, bbox: { ...w.bbox, y1: w.bbox.y0 + 8 } }))
    const r = checkWarning(tiny)
    expect(r.status).toBe('check')
    expect(r.reason).toMatch(/very small/)
  })
  it('sends a few missing words to review, not a mismatch', () => {
    expect(check(WARNING_TEXT.replace(' health', '')).status).toBe('check')
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
    const r = checkLabel({ words: wordsFrom('Brewed and bottled by MALT & HOP BREWERY Honey Ale 5% Alc./Vol. 1 Pint HYATTSVILLE, MD'), application: MALT }).fields.find((f) => f.id === 'bottler')
    expect(r.apart).toBe(true)
    expect(r.found).not.toMatch(/elsewhere/)
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

describe('net contents with two parts and two unit systems', () => {
  const net = (label, application) => {
    const app = { ...APP, netContents: application }
    const text = `Harlan Ridge ${APP.classType} 45% Alc./Vol. ${label} Bottled by ${APP.bottler} ${WARNING_TEXT}`
    return status(text, app).netContents
  }
  it('adds the parts of "1 PINT, 0.9 FL. OZ." (500 mL)', () => {
    expect(parseNetContents('1 PINT, 0.9 FL. OZ.')).toMatchObject([{ ml: 499.8, system: 'us' }])
    expect(net('1 PINT, 0.9 FL. OZ.', '1 Pint, 0.9 Fl. Oz.')).toBe('match')
  })
  it('does not match when the label leaves out the second part (sent to review)', () => {
    expect(net('1 PINT', '1 Pint, 0.9 Fl. Oz.')).toBe('check')
  })
  it('matches 500 mL against 1 pint 0.9 fl oz', () => {
    expect(net('1 PINT, 0.9 FL. OZ.', '500 mL')).toBe('match')
  })
  it('allows only rounding between systems: 25.4 fl oz is 750 mL', () => {
    expect(net('25.4 FL OZ', '750 mL')).toBe('match')
    expect(net('750 mL', '25.4 fl oz')).toBe('match')
    expect(net('24 FL OZ', '750 mL')).toBe('mismatch')
  })
  it('stays exact inside one system', () => {
    expect(net('700 mL', '750 mL')).toBe('mismatch')
    expect(net('751 mL', '750 mL')).toBe('mismatch')
  })
  it('does not add a metric amount to a US amount', () => {
    expect(parseNetContents('750 mL 25.4 FL OZ')).toHaveLength(2)
  })
})

describe('net contents printed in two places', () => {
  const w = (text, x0, y0, x1, y1) => ({ text, confidence: 95, bbox: { x0, y0, x1, y1 } })
  const MALT = { ...APP, brand: 'Malt', netContents: '1 Pint, 0.9 Fl. Oz.' }
  const run = (words) => checkLabel({ words, application: MALT }).fields.find((f) => f.id === 'netContents')
  // Side by side boxes: "5% ALC./VOL." on the left, "1 PINT, 0.9 FL. OZ." on the right, in reading order by line.
  const sideBySide = [
    w('5%', 0, 100, 40, 130), w('1', 120, 100, 135, 130), w('PINT,', 140, 100, 200, 130),
    w('ALC./VOL.', 0, 135, 100, 165), w('0.9', 120, 135, 160, 165), w('FL.', 165, 135, 195, 165), w('OZ.', 200, 135, 240, 165),
  ]
  it('joins the second line to the first when it sits right under it', () => {
    const r = run(sideBySide)
    expect(r.status).toBe('match')
    expect(r.found).toBe('1 PINT, 0.9 FL. OZ.')
  })
  it('sends a label showing only the first part to review, not to mismatch', () => {
    const r = run(sideBySide.slice(0, 3))
    expect(r.status).toBe('check')
    expect(r.reason).toMatch(/only part/)
  })
  it('does not join amounts that are far apart', () => {
    const far = [w('1', 0, 0, 15, 30), w('PINT,', 20, 0, 80, 30), w('Distilled', 0, 200, 90, 230), w('0.9', 0, 400, 40, 430), w('FL.', 45, 400, 75, 430), w('OZ.', 80, 400, 120, 430)]
    expect(run(far).status).toBe('check')
  })
})

describe('what the label says when the application names something else', () => {
  // A label drawn as lines: each line has a height (the big brand line is tallest).
  function label(lines) {
    const words = []
    let y = 0
    for (const { text, h } of lines) {
      let x = 0
      for (const t of text.split(' ')) { words.push({ text: t, confidence: 95, bbox: { x0: x, y0: y, x1: x + t.length * h * 0.5, y1: y + h } }); x += t.length * h * 0.5 + h * 0.3 }
      y += h * 1.6
    }
    return words
  }
  const ABC = label([
    { text: 'DISTILLED AND BOTTLED BY:', h: 14 }, { text: 'ABC DISTILLERY', h: 24 }, { text: 'FREDERICK, MD', h: 24 },
    { text: 'ABC', h: 90 }, { text: 'SINGLE BARREL', h: 30 }, { text: 'STRAIGHT RYE WHISKY', h: 34 },
    { text: '750 mL', h: 28 }, { text: '45% ALC/VOL', h: 28 },
  ])
  const other = { brand: 'Malt & Hop', classType: 'Ale with Honey and Huckleberry Flavor', abv: '45% Alc./Vol.', netContents: '750 mL', bottler: 'Malt & Hop Brewery, Hyattsville, MD', imported: false }
  const field = (id) => checkLabel({ words: ABC, application: other }).fields.find((f) => f.id === id)

  it('shows the largest text when the brand is not on the label', () => {
    const f = field('brand')
    expect(f.status).toBe('check')
    expect(f.found).toBe('ABC')
    expect(f.reason).toMatch(/largest text the app could read on the label is "ABC"/)
  })
  it('shows the line with the class when the class is not on the label', () => {
    const f = field('classType')
    expect(f.status).toBe('check')
    expect(f.found).toBe('STRAIGHT RYE WHISKY')
    expect(f.reason).toMatch(/not "Ale with Honey/)
  })
  it('shows the bottled-by lines when the bottler is not on the label', () => {
    const f = field('bottler')
    expect(f.status).toBe('check')
    expect(f.found).toBe('DISTILLED AND BOTTLED BY: ABC DISTILLERY FREDERICK, MD')
  })
  it('still says not found when the label has nothing to show', () => {
    const f = checkLabel({ words: label([{ text: '750 mL', h: 20 }]), application: other }).fields.find((x) => x.id === 'bottler')
    expect(f.found).toBeNull()
    expect(f.reason).toMatch(/was not found/)
  })
  it('never turns a missing match into Match', () => {
    for (const id of ['brand', 'classType', 'bottler']) expect(field(id).status).not.toBe('match')
  })
})
