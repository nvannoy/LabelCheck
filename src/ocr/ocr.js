import { createWorker } from 'tesseract.js'

// Every path is on this app's own origin, so nothing loads from a CDN.
// workerBlobURL false avoids wrapping the worker in a blob; cacheMethod none
// keeps the browser from writing the language data to IndexedDB.
export function startWorker() {
  return createWorker('eng', 1, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr',
    langPath: '/ocr',
    workerBlobURL: false,
    cacheMethod: 'none',
  })
}

export function flattenWords(data) {
  const words = []
  for (const block of data.blocks ?? [])
    for (const para of block.paragraphs)
      for (const line of para.lines)
        for (const w of line.words)
          words.push({ text: w.text, confidence: w.confidence, bbox: w.bbox })
  return words
}

export async function readImage(worker, image) {
  const t0 = performance.now()
  const { data } = await worker.recognize(image, {}, { blocks: true })
  return { words: flattenWords(data), ms: performance.now() - t0 }
}
