// Node harness around src/ocr/read.js, shared by the check scripts.
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { createWorker, PSM } from 'tesseract.js'
import { gunzipSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readLabel } from '../src/ocr/read.js'
import { measureWarning } from '../src/ocr/measure.js'
import { flattenWords } from '../src/ocr/ocr.js'

export async function startNodeWorker() {
  const langDir = join(tmpdir(), 'labelcheck-lang')
  mkdirSync(langDir, { recursive: true })
  writeFileSync(join(langDir, 'eng.traineddata'), gunzipSync(readFileSync('public/ocr/eng.traineddata.gz')))
  const worker = await createWorker('eng', 1, { langPath: langDir, gzip: false, cacheMethod: 'none' })
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
  return worker
}

export async function readFile(worker, path, options = {}) {
  const img = await loadImage(path)
  const recognize = async (canvas, { sparse } = {}) => {
    if (sparse) await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    try {
      const { data } = await worker.recognize(canvas.toBuffer('image/png'), {}, { blocks: true })
      return flattenWords(data)
    } finally {
      if (sparse) await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
    }
  }
  return readLabel({
    source: img, width: img.width, height: img.height,
    makeCanvas: (w, h) => createCanvas(w, h), recognize, ...options,
  })
}

// The same measurement the app runs after a read, with the node canvas.
export async function measureFile(path, { statementWords, panels, labelWidthIn, netContents, quality }) {
  const img = await loadImage(path)
  return measureWarning({
    source: img, width: img.width, height: img.height, makeCanvas: (w, h) => createCanvas(w, h),
    statementWords, panels, labelWidthIn, netContents, quality,
  })
}
