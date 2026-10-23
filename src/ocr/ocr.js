import { createWorker, PSM } from 'tesseract.js'
import { readLabel } from './read.js'

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
  }, {
    // Tesseract prints notes such as "Estimating resolution as 437" to stderr, which the
    // browser shows as console errors. They are not errors, so send them nowhere.
    debug_file: '/dev/null',
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

// The image is read back from the canvas several times, so say so up front. That also keeps
// the browser from printing a console warning about it.
export function makeCanvas(w, h) {
  const canvas = new OffscreenCanvas(w, h)
  canvas.getContext('2d', { willReadFrequently: true })
  return canvas
}

// application is optional. When the agent has already pasted it, brand and
// class are also checked for the second-pass decision.
export async function readImage(worker, image, { application, secondPass, onFirstPass } = {}) {
  const bitmap = await createImageBitmap(image)
  // The worker is shared between images, so sparse mode is switched on for one
  // read and always switched back.
  const recognize = async (canvas, { sparse } = {}) => {
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    if (sparse) await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    try {
      const { data } = await worker.recognize(blob, {}, { blocks: true })
      return flattenWords(data)
    } finally {
      if (sparse) await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
    }
  }
  try {
    return await readLabel({ source: bitmap, width: bitmap.width, height: bitmap.height, makeCanvas, recognize, application, secondPass, onFirstPass })
  } finally {
    bitmap.close()
  }
}
