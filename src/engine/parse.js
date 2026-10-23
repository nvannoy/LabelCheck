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
const NET = /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz\.?|ml|cl|liters?|litres?|l|oz|pints?|pt|quarts?|qt|gal(?:lon)?)\b/gi

// Net contents, converted to millilitres and rounded to 0.1 so "75 cl" equals "750 mL".
export function parseNetContents(text) {
  return [...text.matchAll(NET)].map((m) => {
    const unit = m[2].toLowerCase().replace(/\s+/g, ' ')
    const factor = UNITS_IN_ML[unit] ?? UNITS_IN_ML[unit.replace(/s$/, '')] ?? UNITS_IN_ML[unit.replace(/\.$/, '')]
    return { ml: Math.round(Number(m[1]) * factor * 10) / 10, raw: m[0], start: m.index }
  })
}

const COUNTRY = /(?:product|produced|made|imported|distilled|bottled)\s+(?:of|in|from)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/gi

// Words after "Product of", "Produced in" and similar. Two-word names are
// returned as read, so callers compare against the application text.
export function parseCountryPhrases(text) {
  return [...text.matchAll(COUNTRY)].map((m) => m[1])
}
