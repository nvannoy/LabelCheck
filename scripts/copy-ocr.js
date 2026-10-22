// Copies the OCR engine and font files into public/ so the app serves them
// from its own origin. Nothing is fetched from a CDN at runtime.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'

const copy = (from, to) => {
  mkdirSync(to, { recursive: true })
  copyFileSync(from, `${to}/${from.split('/').pop()}`)
}

copy('node_modules/tesseract.js/dist/worker.min.js', 'public/ocr')
copy('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'public/ocr')

// tesseract.js only imports the .wasm.js builds (WASM embedded in the script).
for (const f of readdirSync('node_modules/tesseract.js-core')) {
  if (f.endsWith('.wasm.js')) copy(`node_modules/tesseract.js-core/${f}`, 'public/ocr')
}

const fontDir = 'node_modules/@fontsource/atkinson-hyperlegible/files'
for (const f of readdirSync(fontDir)) {
  if (/^atkinson-hyperlegible-latin-(400|700)-normal\.woff2$/.test(f)) copy(`${fontDir}/${f}`, 'public/fonts')
}
