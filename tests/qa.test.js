// Stakeholder QA plan cases that need no browser (tests/qa/QA-PLAN.md). Each describe is
// named by its case ID. Label cases that need a real OCR read run in npm run evaluate.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FIELDS } from '../src/engine/fields.js'
import { checkLabel } from '../src/engine/check.js'
import { applicationFromText, parseApplication } from '../src/engine/parse.js'
import { rowStatus } from '../src/ui/status.js'
import { wordsFrom } from './engine-helpers.js'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const results = JSON.parse(read('tests/expected-results.json'))
const label = (id) => results.find((r) => r.id === id)
const run = (id, over = {}) => {
  const r = label(id)
  const text = Object.values(r.labelText).filter(Boolean).join(' ')
  const { application } = applicationFromText(r.applicationText)
  return checkLabel({ words: wordsFrom(text), application: { ...application, ...over } })
}
const status = (out, id) => out.fields.find((f) => f.id === id).status

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    statSync(p).isDirectory() ? out.push(...walk(p)) : out.push(p)
  }
  return out
}
const sourceFiles = (dir) => walk(fileURLToPath(new URL(`../${dir}`, import.meta.url))).filter((f) => /\.(jsx?|html|css)$/.test(f))

describe('B1 seven fields', () => {
  it('has exactly the seven fields of the brief, one config entry each', () => {
    expect(FIELDS.map((f) => f.label)).toEqual(['Brand name', 'Class and type', 'Alcohol content', 'Net contents', 'Bottler name and address', 'Country of origin', 'Government warning'])
    for (const f of FIELDS) expect(typeof f.compare).toBe('function')
  })
})

describe('B2 country of origin only for imports', () => {
  it('is not required for a domestic product and required for an import', () => {
    expect(status(run('c01-clean-bourbon'), 'country')).toBe('na')
    expect(status(run('c01-clean-bourbon', { imported: true, country: 'Mexico' }), 'country')).toBe('check')
    expect(status(run('c05-clean-tequila-import'), 'country')).toBe('match')
    expect(status(run('d11-import-country-missing'), 'country')).toBe('check')
    expect(status(run('d12-import-country-wrong'), 'country')).toBe('mismatch')
  })
})

describe('B3 number fields are exact', () => {
  it('flags a wrong number, sends a missing one to review, and accepts equal units', () => {
    expect(status(run('d01-abv-wrong'), 'abv')).toBe('mismatch')
    expect(status(run('d03-abv-proof-only'), 'abv')).toBe('check')
    expect(status(run('d04-net-wrong'), 'netContents')).toBe('mismatch')
    expect(status(run('d05-net-missing'), 'netContents')).toBe('check')
    expect(status(run('c01-clean-bourbon', { netContents: '75 cl' }), 'netContents')).toBe('match')
    expect(status(run('c01-clean-bourbon', { netContents: '0.75 L' }), 'netContents')).toBe('match')
  })
})

describe('B4 application text pasted as one block', () => {
  const text = (id) => read(`tests/applications/${id}.txt`)
  it('reads blocks with different field names and extra lines', () => {
    for (const id of ['c01-clean-bourbon', 'c02-clean-vodka', 'c03-clean-gin-dark']) expect(parseApplication(text(id)).found).toBeGreaterThanOrEqual(5)
    expect(applicationFromText(text('c02-clean-vodka')).application.imported).toBe(false)
  })
  it('finds 5 of 6 when a line is deleted, and 0 for unrelated text', () => {
    const noNet = text('c01-clean-bourbon').split('\n').filter((l) => !/^Net Contents/i.test(l)).join('\n')
    expect(parseApplication(noNet).found).toBe(4 + 1) // country line (Origin) still counts
    expect(parseApplication('The quick brown fox jumps over the lazy dog.\nSecond line, no colon.').found).toBe(0)
  })
})

describe('D1 judgment, D2 a different brand is not waved through', () => {
  it('treats capitals and apostrophes as the same brand', () => {
    expect(status(run('c07-brand-case-differs'), 'brand')).toBe('match')
    expect(status(run('c08-brand-apostrophe-differs'), 'brand')).toBe('match')
  })
  it('does not match a different brand', () => {
    expect(status(run('d06-brand-different'), 'brand')).not.toBe('match')
  })
})

describe('J1 to J4 the warning is checked word for word', () => {
  const warn = (id) => run(id).fields.find((f) => f.id === 'warning')
  it('matches the exact wording and names every difference', () => {
    expect(warn('c01-clean-bourbon').reason).toMatch(/matches the required wording exactly/)
    expect(warn('d13-warning-word-changed')).toMatchObject({ status: 'mismatch' })
    expect(warn('d13-warning-word-changed').reason).toMatch(/truck/)
    expect(warn('d14-warning-sentence-dropped').reason).toMatch(/Clause \(2\)/)
    expect(warn('d15-warning-title-mixed-case').reason).toMatch(/capital letters/)
    expect(warn('d17-warning-clauses-swapped').status).toBe('mismatch')
  })
  it('never treats a missing warning as correct', () => {
    const out = run('d16-warning-missing')
    expect(out.fields.find((f) => f.id === 'warning')).toMatchObject({ status: 'check' })
    expect(out.tier).not.toBe('ready')
  })
})

describe('J5, J8 bold and legibility are shown to the agent', () => {
  it('lists bold and legibility for the agent when nothing was measured', () => {
    const w = run('c01-clean-bourbon').fields.find((f) => f.id === 'warning')
    expect(w.byEye.join(' ')).toMatch(/Bold type/)
    expect(w.byEye.join(' ')).toMatch(/readable/)
  })
  it('shows a matching warning as "Check bold", never plain Match', () => {
    const w = run('c01-clean-bourbon').fields.find((f) => f.id === 'warning')
    expect(rowStatus(w).text).toBe('Check bold')
  })
})

describe('D4, D5 no shortcuts that hide mistakes', () => {
  const ui = sourceFiles('src/ui').map((f) => readFileSync(f, 'utf8')).join('\n')
  it('has no confirm-all or approve-all control', () => {
    expect(ui).not.toMatch(/confirm all|approve all|verify all|mark all/i)
  })
  it('asks before verifying a Likely reject label', () => {
    expect(ui).toMatch(/Mark it verified anyway/)
    expect(ui).toMatch(/result\.tier === 'reject'/)
  })
  it('never preselects a decision', () => {
    expect(ui).toMatch(/useState\(null\) \/\/ the agent's decision/)
  })
})

describe('S7 status never depends on color', () => {
  it('uses a different symbol and wording for each result', () => {
    const shown = ['match', 'check', 'mismatch', 'na'].map((status) => rowStatus({ id: 'brand', status }))
    expect(new Set(shown.map((s) => s.symbol)).size).toBe(4)
    expect(new Set(shown.map((s) => s.text)).size).toBe(4)
  })
  it('gives each result its own border style in the stylesheet', () => {
    const css = read('src/ui/theme.css')
    expect(css).toMatch(/\.pill\.match \{ border: 2px solid/)
    expect(css).toMatch(/\.pill\.check \{ border: 2px dashed/)
    expect(css).toMatch(/\.pill\.mismatch \{ border: 3px solid/)
    expect(css).toMatch(/\.pill\.na \{ border: 1px solid/)
  })
})

describe('S8 readable contrast (WCAG AA, 4.5 to 1)', () => {
  const css = read('src/ui/theme.css')
  const token = (name) => css.match(new RegExp(`--${name}: (#[0-9A-Fa-f]{6})`))[1]
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const pairs = [
    ['ink', 'bg'], ['ink', 'card'], ['ink-2', 'card'], ['ink-2', 'gray-bg'], ['muted', 'bg'], ['muted', 'card'],
    ['navy', 'card'], ['navy', 'hint-bg'], ['card', 'navy'], ['green', 'green-bg'], ['green', 'card'],
    ['amber', 'amber-bg'], ['amber', 'card'], ['red', 'card'], ['red-ink', 'red-bg'], ['card', 'red'],
  ]
  for (const [fg, bg] of pairs) {
    it(`${fg} on ${bg}`, () => expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5))
  }
})

describe('M2 nothing sensitive is stored', () => {
  const files = sourceFiles('src').map((f) => ({ f, s: readFileSync(f, 'utf8') }))
  it('writes only the text size to localStorage', () => {
    const using = files.filter(({ s }) => /localStorage/.test(s)).map(({ f }) => f.split('/').pop())
    expect(using).toEqual(['useTextSize.js'])
    expect(read('src/ui/useTextSize.js')).toMatch(/labelcheck-text-size/)
  })
  it('does not use session storage, IndexedDB, cookies or the Cache API', () => {
    for (const { s } of files) expect(s).not.toMatch(/sessionStorage|indexedDB|document\.cookie|caches\.open/)
  })
  it('keeps the OCR language data out of IndexedDB', () => {
    expect(read('src/ocr/ocr.js')).toMatch(/cacheMethod: 'none'/)
  })
})

describe('M3, M4 no outside connections', () => {
  const files = [...sourceFiles('src'), fileURLToPath(new URL('../index.html', import.meta.url))]
  it('has no URL to another site in the app source or page', () => {
    for (const f of files) {
      const urls = (readFileSync(f, 'utf8').match(/https?:\/\/[^\s'"`)]+/g) ?? []).filter((u) => !/w3\.org|reactjs\.org|localhost/.test(u))
      expect(urls, f).toEqual([])
    }
  })
  it('loads the OCR engine, language data and fonts from its own paths', () => {
    const ocr = read('src/ocr/ocr.js')
    for (const p of ["workerPath: '/ocr/", "corePath: '/ocr'", "langPath: '/ocr'"]) expect(ocr).toContain(p)
    expect(read('src/ui/theme.css')).not.toMatch(/fonts\.googleapis|fonts\.gstatic/)
  })
  it('makes no network requests from the app code', () => {
    for (const f of sourceFiles('src')) expect(readFileSync(f, 'utf8')).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/)
  })
})

describe('M5 a policy that enforces it', () => {
  const headers = read('public/_headers')
  it('sets a strict Content-Security-Policy', () => {
    for (const d of ["default-src 'self'", "connect-src 'self'", "worker-src 'self' blob:", "script-src 'self' 'wasm-unsafe-eval'", "frame-ancestors 'none'"]) expect(headers).toContain(d)
    expect(headers).not.toMatch(/'unsafe-inline'|'unsafe-eval'|\*\.|https?:/)
  })
})

describe('M6 static hosting, easy to move to Azure', () => {
  it('has no Netlify functions or Netlify-only features', () => {
    expect(existsSync(new URL('../netlify/functions', import.meta.url))).toBe(false)
    const toml = read('netlify.toml')
    expect(toml).not.toMatch(/\[functions\]|\[\[edge_functions\]\]|forms|identity/i)
    expect(execSync('git ls-files', { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' })).not.toMatch(/netlify\/functions|\.netlify\//)
  })
  it('lists the migration steps in the README', () => {
    const readme = read('README.md')
    expect(readme).toMatch(/## Moving to Azure Static Web Apps/)
    expect(readme).toMatch(/staticwebapp\.config\.json/)
  })
})

describe('M7, B7, B8 prototype statement and documentation', () => {
  it('shows the prototype footer text', () => {
    expect(read('src/ui/Header.jsx')).toContain('Prototype built for a take-home assessment. Not affiliated with or endorsed by TTB.')
  })
  it('has the README sections the brief asks for', () => {
    const readme = read('README.md')
    for (const h of ['How this was built', 'Approach', 'Setup and running', 'Tools', 'Security', 'Testing', 'Results', 'Assumptions', 'Limitations']) expect(readme).toMatch(new RegExp(`^## ${h}`, 'm'))
    expect(readme).toMatch(/Claude Code wrote most of the code/)
    expect(readme).toMatch(/https:\/\/labelcheck-grtwrx\.netlify\.app/)
  })
  it('states the known limits in the README', () => {
    const readme = read('README.md')
    expect(readme).toMatch(/Batch upload is not built/)
    expect(readme).toMatch(/Skew and glare/)
    expect(readme).toMatch(/One image per application/)
    expect(readme).toMatch(/Seven common elements, not type-specific rules/)
    expect(readme).toMatch(/Minimum type size/)
  })
  it('keeps browser code out of the engine', () => {
    for (const f of sourceFiles('src/engine')) expect(readFileSync(f, 'utf8'), f).not.toMatch(/\b(window|document|navigator|localStorage|OffscreenCanvas|fetch)\b/)
  })
})

describe('B10 repository hygiene', () => {
  const tracked = execSync('git ls-files', { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' }).split('\n').filter(Boolean)
  it('tracks no secrets and no generated label images', () => {
    expect(tracked.filter((f) => /(^|\/)\.env|\.pem$|\.key$|secret|credentials/i.test(f))).toEqual([])
    expect(tracked.filter((f) => f.startsWith('generated/') || f.startsWith('public/ocr/'))).toEqual([])
  })
  it('has CLAUDE.md and the docs', () => {
    for (const f of ['CLAUDE.md', 'README.md', 'docs/rules-reference.md', 'tests/TEST-PROCEDURE.md', 'tests/qa/QA-PLAN.md']) expect(tracked).toContain(f)
  })
})
