// Interim check before the rules engine exists: runs OCR over the 30 test
// images and reports time and whether each printed value was read back.
// Node uses the same prepare step as the browser, but its canvas differs a
// little, so browser timings and accuracy can be somewhat worse.
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { createWorker } from 'tesseract.js'
import { gunzipSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepare } from '../src/ocr/prepare.js'

const results = JSON.parse(readFileSync('tests/expected-results.json', 'utf8'))

const langDir = join(tmpdir(), 'labelcheck-lang')
mkdirSync(langDir, { recursive: true })
writeFileSync(join(langDir, 'eng.traineddata'), gunzipSync(readFileSync('public/ocr/eng.traineddata.gz')))
const worker = await createWorker('eng', 1, { langPath: langDir, gzip: false, cacheMethod: 'none' })

const norm = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%.\/ ]+/g, ' ').replace(/\s+/g, ' ').trim()
const squash = (s) => norm(s).replace(/ /g, '')

const rows = []
for (const r of results) {
  const img = await loadImage(r.image)
  const canvas = prepare(img, img.width, img.height, (w, h) => createCanvas(w, h))
  const t0 = performance.now()
  const { data } = await worker.recognize(canvas.toBuffer('image/png'), {}, { blocks: true })
  const ms = Math.round(performance.now() - t0)
  const words = data.blocks.flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)))
  const text = squash(words.map((w) => w.text).join(' '))
  const conf = words.length ? Math.round(words.reduce((a, w) => a + w.confidence, 0) / words.length) : 0

  // Generated labels: did each printed value come back? Samples: use application text.
  const printed = r.labelText ?? {
    brand: r.application.brand, classType: r.application.classType, abv: r.application.abv,
    netContents: r.application.netContents, bottler: r.application.bottler,
  }
  const found = {}
  for (const [k, v] of Object.entries(printed)) {
    if (!v) continue
    found[k] = text.includes(squash(v))
  }
  rows.push({ id: r.id, ms, words: words.length, conf, found })
}
await worker.terminate()

const pad = (s, n) => String(s).padEnd(n)
console.log(pad('label', 34), pad('ms', 6), pad('words', 6), pad('conf', 5), 'values NOT read back exactly')
for (const r of rows) {
  const missing = Object.entries(r.found).filter(([, ok]) => !ok).map(([k]) => k)
  console.log(pad(r.id, 34), pad(r.ms, 6), pad(r.words, 6), pad(r.conf, 5), missing.join(', ') || '-')
}
const total = rows.reduce((a, r) => a + r.ms, 0)
const sorted = rows.map((r) => r.ms).sort((a, b) => a - b)
console.log(`\n${rows.length} images, mean ${Math.round(total / rows.length)} ms, median ${sorted[Math.floor(sorted.length / 2)]} ms, max ${sorted.at(-1)} ms`)
const flat = rows.flatMap((r) => Object.entries(r.found))
console.log(`values read back exactly: ${flat.filter(([, ok]) => ok).length} of ${flat.length}`)
