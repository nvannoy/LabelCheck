// npm run evaluate: reads every test label with OCR, runs the engine, and
// scores the result against tests/expected-results.json.
// Scoring rules are in tests/TEST-PROCEDURE.md. The key measure is zero
// known-bad labels coming out Ready to Approve.
import { readFileSync } from 'node:fs'
import { startNodeWorker, readFile } from './node-ocr.js'
import { checkLabel } from '../src/engine/check.js'
import { applicationFromText } from '../src/engine/parse.js'

const results = JSON.parse(readFileSync('tests/expected-results.json', 'utf8'))
const worker = await startNodeWorker()

const rank = { match: 0, na: 0, check: 1, mismatch: 2 }
const rows = []
for (const r of results) {
  const t0 = performance.now()
  // The application comes from the paste-ready text, as it does in the app.
  const { application } = applicationFromText(r.applicationText)
  const read = await readFile(worker, r.image, { application })
  const out = checkLabel({ words: read.words, application, quality: read.quality })
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
process.exit(rows.some((r) => r.badReady || r.failures.length) ? 1 : 0)
