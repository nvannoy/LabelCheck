// Draws the made-up sample label used by the in-app tour and records what the reader
// finds on it, so the tour shows real results without running OCR.
// Fictional brand only. Uses macOS system fonts, so run it on a Mac:
//   node scripts/make-tour-sample.js
// Writes src/tour/sample-label.png and src/tour/sample-read.json. Both are committed
// because the app ships and uses them.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync } from 'node:fs'
import { startNodeWorker, readFile } from './node-ocr.js'
import { WARNING } from './label-specs.js'

GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Georgia.ttf', 'Georgia')
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Georgia Bold.ttf', 'GeorgiaBold')

const W = 900
const H = 1200
const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#efe6cf'
ctx.fillRect(0, 0, W, H)
ctx.strokeStyle = '#33291a'
ctx.lineWidth = 6
ctx.strokeRect(30, 30, W - 60, H - 60)
ctx.lineWidth = 2
ctx.strokeRect(46, 46, W - 92, H - 92)
ctx.fillStyle = '#2a2014'
ctx.textAlign = 'center'

const line = (text, y, font) => { ctx.font = font; ctx.fillText(text, W / 2, y) }
line('CEDAR FORK', 230, '96px GeorgiaBold')
line('Straight Rye Whiskey', 360, '44px Georgia')
line('45% Alc./Vol. (90 Proof)', 480, '38px Georgia')
line('750 mL', 550, '38px Georgia')
line('Bottled by Cedar Fork Distilling Co., Louisville, KY', 680, '27px Georgia')

// The warning, wrapped to the label width. The first two words are the bold title.
ctx.textAlign = 'left'
let y = 850
let first = true
const drawRow = (row) => {
  let x = 80
  row.forEach((t, i) => {
    ctx.font = first && i < 2 ? '22px GeorgiaBold' : '22px Georgia'
    ctx.fillText(t, x, y)
    x += ctx.measureText(`${t} `).width
  })
  y += 34
  first = false
}
const widthOf = (row) => row.reduce((a, t, i) => { ctx.font = first && i < 2 ? '22px GeorgiaBold' : '22px Georgia'; return a + ctx.measureText(`${t} `).width }, 0)
let row = []
for (const word of WARNING.split(' ')) {
  if (row.length && widthOf([...row, word]) > W - 160) { drawRow(row); row = [] }
  row.push(word)
}
drawRow(row)

writeFileSync('src/tour/sample-label.png', canvas.toBuffer('image/png'))

const worker = await startNodeWorker()
const read = await readFile(worker, 'src/tour/sample-label.png', {})
await worker.terminate()
const { words: found, panels, quality } = read
writeFileSync('src/tour/sample-read.json', `${JSON.stringify({ words: found, panels, quality }, null, 1)}\n`)
console.log(`wrote src/tour/sample-label.png and src/tour/sample-read.json (${found.length} words)`)
