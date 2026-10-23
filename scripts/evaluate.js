// npm run evaluate: reads every test label with OCR, runs the engine, and
// scores the result against tests/expected-results.json.
// Scoring rules are in tests/TEST-PROCEDURE.md. The key measure is zero
// known-bad labels coming out Ready to Approve.
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { startNodeWorker, readFile, measureFile } from './node-ocr.js'
import { checkLabel } from '../src/engine/check.js'
import { applicationFromText } from '../src/engine/parse.js'
import { QA_LABEL_CASES, judge } from '../tests/qa/label-cases.js'

let results = JSON.parse(readFileSync('tests/expected-results.json', 'utf8'))

// The generated labels are not committed. On a fresh clone, draw them first (the drawing
// script uses macOS system fonts). Where that is not possible, run on the committed
// sample images only and say so.
if (results.some((r) => !existsSync(r.image))) {
  try {
    execFileSync('node', ['scripts/make-test-labels.js'], { stdio: 'inherit' })
  } catch {
    // handled below
  }
}
const missing = results.filter((r) => !existsSync(r.image))
if (missing.length) {
  console.log(`Skipping ${missing.length} generated labels: their images could not be drawn here. Run node scripts/make-test-labels.js on a Mac to evaluate the full set.`)
  results = results.filter((r) => existsSync(r.image))
}
const worker = await startNodeWorker()

const rank = { match: 0, na: 0, check: 1, mismatch: 2 }
const rows = []
for (const r of results) {
  const t0 = performance.now()
  // The application comes from the paste-ready text, as it does in the app.
  const { application } = applicationFromText(r.applicationText)
  const read = await readFile(worker, r.image, { application })
  // The type measurement runs on the warning's words, as the app does after a read.
  const first = checkLabel({ words: read.words, application, quality: read.quality })
  const statementWords = first.fields.find((f) => f.id === 'warning').statementWords
  const typography = statementWords
    ? await measureFile(r.image, { statementWords, quality: read.quality })
    : null
  const out = checkLabel({ words: read.words, application, quality: read.quality, typography })
  const ms = Math.round(performance.now() - t0)

  const failures = [] // dangerous: a bad field called match
  const extra = []    // a good field sent to review
  for (const f of out.fields) {
    const want = r.expected.fields[f.id]
    if (want === 'match' && f.status !== 'match') extra.push(`${f.id}:${f.status}`)
    if ((want === 'mismatch' || want === 'check') && f.status === 'match') failures.push(`${f.id}:match`)
  }
  const badReady = r.expected.overall === 'not-ready' && out.overall === 'ready'
  rows.push({ id: r.id, ms, out, expected: r.expected, failures, extra, badReady })
}
await worker.terminate()

const pad = (s, n) => String(s).padEnd(n)
console.log(pad('label', 34), pad('ms', 6), pad('expected', 10), pad('got', 10), 'notes')
for (const r of rows) {
  const notes = [...r.failures.map((f) => `FAIL ${f}`), ...r.extra.map((f) => `extra review ${f}`)]
  console.log(pad(r.id, 34), pad(r.ms, 6), pad(r.expected.overall, 10), pad(r.out.overall, 10), r.badReady ? 'BAD LABEL READY! ' : '', notes.join('; '))
}

const times = rows.map((r) => r.ms).sort((a, b) => a - b)
const bad = rows.filter((r) => r.expected.overall === 'not-ready')
const clean = rows.filter((r) => r.expected.overall === 'ready')
const fieldCount = rows.reduce((a, r) => a + r.out.fields.filter((f) => f.status !== 'na').length, 0)
const exact = rows.reduce((a, r) => a + r.out.fields.filter((f) => f.status === r.expected.fields[f.id] || (f.status === 'na' && r.expected.fields[f.id] === 'na')).length, 0)
console.log('\nKnown-bad labels:', bad.length, '| called Ready to Approve:', bad.filter((r) => r.badReady).length, '(target 0)')
console.log('Field failures (bad field called match):', rows.reduce((a, r) => a + r.failures.length, 0))
console.log('Clean labels:', clean.length, '| Ready to Approve:', clean.filter((r) => r.out.overall === 'ready').length, '| sent to review:', clean.filter((r) => r.out.overall !== 'ready').length)
console.log(`Field results exactly as expected: ${exact} of ${rows.length * 7} (${Math.round((100 * exact) / (rows.length * 7))}%), counting ${fieldCount} required fields`)
console.log(`Time per label: mean ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms, median ${times[Math.floor(times.length / 2)]} ms, max ${times.at(-1)} ms`)

// The stakeholder QA plan's label cases (tests/qa/QA-PLAN.md).
console.log('\nQA plan label cases')
let qaFail = 0
for (const c of QA_LABEL_CASES) {
  const row = rows.find((r) => r.id === c.id)
  if (!row) { console.log(pad(c.qa, 8), pad(c.id, 34), 'SKIPPED'); continue }
  const verdict = judge(c, row.out)
  if (verdict === 'fail') qaFail++
  console.log(pad(c.qa, 8), pad(c.id, 34), pad(verdict.toUpperCase(), 9), pad(row.out.tier, 7), c.need)
}
const counts = (v) => QA_LABEL_CASES.filter((c) => rows.find((r) => r.id === c.id) && judge(c, rows.find((r) => r.id === c.id).out) === v).length
console.log(`QA label cases: ${counts('pass')} pass, ${counts('recorded')} recorded as extra review, ${qaFail} fail`)
process.exit(rows.some((r) => r.badReady || r.failures.length) || qaFail ? 1 : 0)
