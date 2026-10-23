// Every test label has paste-ready application text (tests/applications/<id>.txt).
// This checks that the parser reads each one back into the application the
// label was built from. Run it with every new version of the parser.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { applicationFromText } from '../src/engine/parse.js'

const results = JSON.parse(readFileSync(new URL('./expected-results.json', import.meta.url), 'utf8'))

describe('application text for each test label', () => {
  it('has a text file for every label, matching expected-results.json', () => {
    for (const r of results) {
      const file = readFileSync(new URL(`./applications/${r.id}.txt`, import.meta.url), 'utf8')
      expect(file.trimEnd()).toBe(r.applicationText)
    }
  })

  for (const r of results) {
    it(`${r.id} parses back to its application`, () => {
      const { application, found, extra } = applicationFromText(r.applicationText)
      const a = r.application
      expect(application.brand).toBe(a.brand)
      expect(application.classType).toBe(a.classType)
      expect(application.abv).toBe(a.abv)
      expect(application.netContents).toBe(a.netContents)
      expect(application.bottler).toBe(a.bottler)
      expect(application.imported).toBe(a.imported)
      expect(application.country ?? null).toBe(a.country)
      expect(extra).toBe(r.extraLines)
      expect(found).toBeGreaterThanOrEqual(5)
    })
  }

  it('reads "Origin: Domestic" and "Country of Origin: United States" as domestic', () => {
    for (const line of ['Origin: Domestic', 'Country of Origin: United States', 'Country: USA']) {
      const { application } = applicationFromText(`Brand Name: A\n${line}`)
      expect(application.imported).toBe(false)
      expect(application.country).toBeUndefined()
    }
  })
  it('reads a named country as an import', () => {
    const { application } = applicationFromText('Brand Name: A\nOrigin: Mexico')
    expect(application).toMatchObject({ imported: true, country: 'Mexico' })
  })
})
