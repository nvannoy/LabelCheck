// Small text helpers shared by the parsers and comparators.
// Own edit-distance code instead of a library: it is 15 lines and easy to audit.

const APOSTROPHES = /[‘’ʼ']/g

// Lower case, apostrophes removed, everything else non-alphanumeric becomes a space.
export const tokens = (s) =>
  s.toLowerCase().replace(APOSTROPHES, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)

export const squash = (s) => tokens(s).join('')

export function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const keep = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = keep
    }
  }
  return prev[b.length]
}

// 1 means identical, 0 means nothing in common.
export function similarity(a, b) {
  const longest = Math.max(a.length, b.length)
  return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest
}
