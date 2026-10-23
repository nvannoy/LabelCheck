// Feeds the exact label text (a perfect OCR read) for every generated label
// through the engine and compares with tests/expected-results.json. This
// checks the engine and the expected results against each other without OCR.
// Labels whose result depends on the pixels (image quality, type) are skipped.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { checkLabel } from '../src/engine/check.js'
import { applicationFromText } from '../src/engine/parse.js'
import { wordsFrom } from './engine-helpers.js'

const results = JSON.parse(readFileSync(new URL('./expected-results.json', import.meta.url), 'utf8'))
const rank = { na: 0, match: 0, check: 1, mismatch: 2 }

describe('golden labels with a perfect read', () => {
  for (const r of results.filter((x) => x.labelText && !x.pixels)) {
    it(r.id, () => {
      const text = Object.values(r.labelText).filter(Boolean).join(' ')
      // The application comes from the paste-ready text, as it does in the app.
      const out = checkLabel({ words: wordsFrom(text), application: applicationFromText(r.applicationText).application })
      for (const f of out.fields) {
        const want = r.expected.fields[f.id]
        // A clean field must match. A bad field may be a mismatch or, safer, a check, but never a match.
        if (want === 'match' || want === 'na') expect(f.status, `${r.id} ${f.id}`).toBe(want)
        else expect(f.status, `${r.id} ${f.id}`).not.toBe('match')
        expect(rank[f.status]).toBeLessThanOrEqual(rank.mismatch)
      }
      expect(out.overall).toBe(r.expected.overall)
    })
  }
})
