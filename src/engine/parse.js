// Pulls numbers out of label text. Rules: 27 CFR 5.65 (alcohol content), 5.70 (net contents).

const ABV = /(\d{1,3}(?:\.\d+)?)\s*(?:%|percent)/gi

// Percentages stated as alcohol content. Proof is ignored on purpose: 5.65 requires a percentage.
export function parseAbv(text) {
  return [...text.matchAll(ABV)].map((m) => ({ value: Number(m[1]), raw: m[0], start: m.index }))
}

const UNITS_IN_ML = {
  ml: 1, cl: 10, l: 1000, liter: 1000, liters: 1000, litre: 1000, litres: 1000,
  oz: 29.5735, 'fl oz': 29.5735, 'fl. oz': 29.5735, 'fl. oz.': 29.5735,
  pint: 473.176, pints: 473.176, pt: 473.176, quart: 946.353, qt: 946.353, gal: 3785.41, gallon: 3785.41,
}
const NET = /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz\.?|ml|cl|liters?|litres?|l|oz|pints?|pt|quarts?|qt|gal(?:lon)?)\b\.?/gi

const US_UNITS = /^(?:fl\.? ?oz\.?|oz|pints?|pt|quarts?|qt|gal(?:lon)?)$/

// Net contents, converted to millilitres and rounded to 0.1 so "75 cl" equals "750 mL".
// "1 PINT, 0.9 FL. OZ." is one amount (the two parts are added: 500 mL). Each item
// also says which system its unit belongs to, because converting between systems
// is only approximate (see sameAmount).
export function parseNetContents(text, { merge = true } = {}) {
  const items = [...text.matchAll(NET)].map((m) => {
    const unit = m[2].toLowerCase().replace(/\s+/g, ' ')
    const factor = UNITS_IN_ML[unit] ?? UNITS_IN_ML[unit.replace(/s$/, '')] ?? UNITS_IN_ML[unit.replace(/\.$/, '')]
    return { exactMl: Number(m[1]) * factor, raw: m[0], start: m.index, end: m.index + m[0].length, system: US_UNITS.test(unit) ? 'us' : 'metric' }
  })
  const merged = []
  for (const item of items) {
    const prev = merged[merged.length - 1]
    const gap = prev ? text.slice(prev.end, item.start) : ''
    if (merge && prev && prev.system === 'us' && item.system === 'us' && /^\s*(?:,|and|&)?\s*$/.test(gap)) {
      prev.exactMl += item.exactMl
      prev.raw = text.slice(prev.start, item.end)
      prev.end = item.end
    } else merged.push({ ...item })
  }
  return merged.map((x) => ({ ml: Math.round(x.exactMl * 10) / 10, raw: x.raw, start: x.start, system: x.system }))
}

// Two amounts are the same when they are equal after unit conversion. Within one
// system that is exact. Between systems the conversion is only approximate (750 mL
// is 25.36 fl oz, which a label prints as 25.4), so a rounding allowance of 0.5%
// applies there and nowhere else. 700 mL against 750 mL is still a mismatch.
export function sameAmount(a, b) {
  if (a.system === b.system) return a.ml === b.ml
  return Math.abs(a.ml - b.ml) / Math.max(a.ml, b.ml) <= 0.005
}

const COUNTRY = /(?:product|produced|made|imported|distilled|bottled)\s+(?:of|in|from)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/gi

// Words after "Product of", "Produced in" and similar. Two-word names are
// returned as read, so callers compare against the application text.
export function parseCountryPhrases(text) {
  return [...text.matchAll(COUNTRY)].map((m) => m[1])
}

// Application text: lines like "Brand Name: Old Tom Distillery". Each label is
// matched against a few plain spellings. Lines that match none are counted as
// extra and ignored (permit numbers, dates and the like).
const APPLICATION_KEYS = [
  ['brand', /^brand(?:\s+name)?$/i],
  ['classType', /^(?:class\s*(?:\/|and|&)?\s*type|class|type|type\s+of\s+product)$/i],
  ['abv', /^(?:alcohol(?:\s+content)?|abv|alcohol\s+by\s+volume)$/i],
  ['netContents', /^(?:net\s+contents?|contents?|net\s+volume)$/i],
  ['bottler', /^(?:applicant|bottler|bottler\s+name(?:\s+and\s+address)?|name\s+and\s+address|producer|distiller|importer)$/i],
  ['country', /^(?:country(?:\s+of\s+origin)?|origin)$/i],
]

export const APPLICATION_FIELDS = APPLICATION_KEYS.map(([id]) => id)

export function parseApplication(text) {
  const fields = {}
  let extra = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const at = line.indexOf(':')
    const label = at > 0 ? line.slice(0, at).trim() : ''
    const value = at > 0 ? line.slice(at + 1).trim() : ''
    const key = value && APPLICATION_KEYS.find(([, re]) => re.test(label))
    if (key && !fields[key[0]]) fields[key[0]] = value
    else extra++
  }
  return { fields, found: Object.keys(fields).length, extra }
}

// "Origin: Domestic" or "Country of Origin: United States" means a domestic
// product, not an import from a country called Domestic.
const DOMESTIC = /^(?:domestic|u\.?\s?s\.?(?:\s?a\.?)?|united\s+states(?:\s+of\s+america)?|america)$/i

export const isDomesticOrigin = (text) => DOMESTIC.test((text ?? '').trim())
export const importedFromCountry = (country) => Boolean(country) && !isDomesticOrigin(country)

// Application text to the application the engine checks against.
export function applicationFromText(text) {
  const { fields, found, extra } = parseApplication(text)
  const imported = importedFromCountry(fields.country)
  const application = { ...fields, imported }
  if (!imported) delete application.country
  return { application, found, extra }
}
