import { createWorker, PSM } from 'tesseract.js'
import { prepare } from './prepare.js'

// Every path is on this app's own origin, so nothing loads from a CDN.
// workerBlobURL false avoids wrapping the worker in a blob; cacheMethod none
// keeps the browser from writing the language data to IndexedDB.
export async function startWorker() {
  const worker = await createWorker('eng', 1, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr',
    langPath: '/ocr',
    workerBlobURL: false,
    cacheMethod: 'none',
  })
  // The library default (one block of text) drops large brand names and short
  // lines such as "1 L". Automatic page segmentation finds them.
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
  return worker
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

const makeCanvas = (w, h) => new OffscreenCanvas(w, h)

async function prepareBlob(image) {
  const bitmap = await createImageBitmap(image)
  const canvas = prepare(bitmap, bitmap.width, bitmap.height, makeCanvas)
  bitmap.close()
  return canvas.convertToBlob({ type: 'image/png' })
}

export async function readImage(worker, image) {
  const t0 = performance.now()
  const { data } = await worker.recognize(await prepareBlob(image), {}, { blocks: true })
  return { words: flattenWords(data), ms: performance.now() - t0 }
}
