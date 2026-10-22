// Quick checks for whether OCR text contains something that looks like a
// required field. Used to decide if a second OCR pass is worth its time.
// Pure functions, no browser APIs.

const squash = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '')

const ABV = /\d{1,3}(?:\.\d+)?\s*(?:%|percent)/i
const NET_CONTENTS = /\d+(?:\.\d+)?\s*(?:ml|cl|l|liters?|litres?|fl\.?\s*oz|oz|pints?|pt|quarts?|qt|gal)\b/i

export const hasAbvCandidate = (text) => ABV.test(text)
export const hasNetContentsCandidate = (text) => NET_CONTENTS.test(text)
export const hasText = (text, wanted) => squash(text).includes(squash(wanted))

// application is optional: brand and class are only checked when we know them.
export function missingRequired(text, application = {}) {
  const missing = []
  if (!hasAbvCandidate(text)) missing.push('abv')
  if (!hasNetContentsCandidate(text)) missing.push('netContents')
  if (application.brand && !hasText(text, application.brand)) missing.push('brand')
  if (application.classType && !hasText(text, application.classType)) missing.push('classType')
  return missing
}
