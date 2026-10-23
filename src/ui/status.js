// How a field result is shown: one place for the words and symbols, so color is
// never the only signal. The government warning is never plain "Match" because
// bold type and size always need the agent's eye.
export function rowStatus(field) {
  if (field.id === 'warning' && field.status === 'match') return { kind: 'check', text: 'Check bold', symbol: '?' }
  return {
    match: { kind: 'match', text: 'Match', symbol: '✓' },
    check: { kind: 'check', text: 'Check', symbol: '?' },
    mismatch: { kind: 'mismatch', text: 'Mismatch', symbol: '✕' },
    na: { kind: 'na', text: 'Not required', symbol: '–' },
  }[field.status]
}

export const TIERS = {
  reject: { name: 'Likely reject', symbol: '✕' },
  review: { name: 'Needs review', symbol: '?' },
  ready: { name: 'Ready to approve', symbol: '✓' },
}

// Shown instead of a tier while the warning title is still being checked for bold.
export const CHECKING = { name: 'Checking the warning title', symbol: '\u2026' }

export function tierSummary(result) {
  const { mismatch, check } = result.counts
  if (result.tier === 'ready') return 'All fields match. Warning bold type and size still need your eye.'
  const parts = []
  if (mismatch) parts.push(`${mismatch} mismatch${mismatch === 1 ? '' : 'es'}`)
  if (check) parts.push(`${check} to check`)
  return parts.join(', ')
}
