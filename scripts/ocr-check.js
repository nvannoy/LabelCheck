// Interim check before the rules engine exists: runs the real read pipeline
// (panel split, upscale, optional second pass) over the test images and
// reports time and whether each printed value was read back.
// Usage: node scripts/ocr-check.js [--second-pass]
// Node's canvas differs a little from the browser's, so browser timings and
// accuracy can be somewhat worse.
import { readFileSync } from 'node:fs'
import { startNodeWorker, readFile } from './node-ocr.js'

const secondPass = process.argv.includes('--second-pass')
const results = JSON.parse(readFileSync('tests/expected-results.json', 'utf8'))
const worker = await startNodeWorker()

const squash = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%.\/]+/g, '')

const rows = []
for (const r of results) {
  const out = await readFile(worker, r.image, { secondPass, application: r.application })
  const text = squash(out.words.map((w) => w.text).join(' '))
  const conf = out.words.length ? Math.round(out.words.reduce((a, w) => a + w.confidence, 0) / out.words.length) : 0
  const printed = r.labelText ?? {
    brand: r.application.brand, classType: r.application.classType, abv: r.application.abv,
    netContents: r.application.netContents, bottler: r.application.bottler,
  }
  const found = {}
  for (const [k, v] of Object.entries(printed)) if (v) found[k] = text.includes(squash(v))
  rows.push({ id: r.id, ms: Math.round(out.ms), words: out.words.length, conf, panels: out.panels.length, second: out.secondPass, found })
}
await worker.terminate()

const pad = (s, n) => String(s).padEnd(n)
console.log(`second pass: ${secondPass ? 'on' : 'off'}`)
console.log(pad('label', 34), pad('ms', 6), pad('words', 6), pad('conf', 5), pad('panels', 7), pad('2nd pass', 14), 'values NOT read back exactly')
for (const r of rows) {
  const missing = Object.entries(r.found).filter(([, ok]) => !ok).map(([k]) => k)
  const second = r.second.ran ? `ran +${r.second.added}w ${Math.round(r.second.ms)}ms` : '-'
  console.log(pad(r.id, 34), pad(r.ms, 6), pad(r.words, 6), pad(r.conf, 5), pad(r.panels, 7), pad(second, 14), missing.join(', ') || '-')
}
const sorted = rows.map((r) => r.ms).sort((a, b) => a - b)
const total = rows.reduce((a, r) => a + r.ms, 0)
console.log(`\n${rows.length} images, mean ${Math.round(total / rows.length)} ms, median ${sorted[Math.floor(sorted.length / 2)]} ms, max ${sorted.at(-1)} ms`)
console.log(`second pass ran on ${rows.filter((r) => r.second.ran).length} images, added words on ${rows.filter((r) => r.second.added > 0).length}`)
const flat = rows.flatMap((r) => Object.entries(r.found))
console.log(`values read back exactly: ${flat.filter(([, ok]) => ok).length} of ${flat.length}`)
