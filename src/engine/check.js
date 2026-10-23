// Runs every field check and sums up the result. The app never approves a
// label: "ready" only means every check passed, and the agent still decides.
import { FIELDS, LABEL_BY_EYE } from './fields.js'
import { indexWords } from './words.js'

const MIN_WIDTH = 500 // px; below this the text is too small to trust OCR
const MIN_CONTRAST = 100 // gray levels between the darkest and lightest 1% of pixels

// quality comes from the OCR step: {width, contrastSpan}.
export function qualityProblems(quality) {
  const problems = []
  if (quality?.width && quality.width < MIN_WIDTH) problems.push(`The image is only ${quality.width} px wide, so small text may be misread.`)
  if (quality?.contrastSpan !== undefined && quality.contrastSpan < MIN_CONTRAST) problems.push('The text has low contrast against the background.')
  return problems
}

export function checkLabel({ words, application, quality }) {
  const index = indexWords(words)
  const problems = qualityProblems(quality)

  const fields = FIELDS.map((f) => {
    const base = { id: f.id, label: f.label, rule: f.rule, bestEffort: Boolean(f.bestEffort) }
    if (f.required === 'imports' && !application.imported) {
      return { ...base, status: 'na', reason: 'Not required for a domestic product.', byEye: [] }
    }
    const r = f.compare(index, application)
    const byEye = [...f.byEye, ...(r.byEye ?? [])]
    if (r.status === 'match' && problems.length) {
      return { ...base, ...r, status: 'check', byEye, reason: `${problems.join(' ')} Confirm this field by eye. (${r.reason})` }
    }
    return { ...base, ...r, byEye }
  })

  const ready = fields.every((f) => f.status === 'match' || f.status === 'na')
  const count = (s) => fields.filter((f) => f.status === s).length
  return {
    fields,
    overall: ready ? 'ready' : 'not-ready',
    counts: { match: count('match'), check: count('check'), mismatch: count('mismatch'), na: count('na') },
    labelByEye: LABEL_BY_EYE,
    imageProblems: problems,
  }
}
