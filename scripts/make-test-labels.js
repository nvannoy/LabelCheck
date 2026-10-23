// Renders the generated test labels and writes tests/expected-results.json.
// Images go to generated/labels/ and are not committed. Fonts are bundled (see fonts.js),
// so it runs the same on macOS, Windows and Linux. Fictional brands only.
import { createCanvas } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { generated, samples, regression } from './label-specs.js'
import { registerFonts } from './fonts.js'

registerFonts()

const W = 900
const H = 1200
const MARGIN = 80

// Draws words wrapped to maxWidth. The first two words (GOVERNMENT WARNING:)
// are bold, as the regulation requires.
function drawWarning(ctx, text, x, y, maxWidth, size, family, lineHeight, titleBold = true, bodyBold = false) {
  const words = text.split(' ')
  let line = []
  let cursor = y
  const flush = () => {
    let cx = x
    for (const w of line) {
      ctx.font = `${w.bold ? `${size}px "${family} Bold"` : `${size}px "${family}"`}`
      ctx.fillText(w.text, cx, cursor)
      cx += ctx.measureText(`${w.text} `).width
    }
    line = []
    cursor += lineHeight
  }
  const widthOf = (items) => {
    let total = 0
    for (const w of items) {
      ctx.font = w.bold ? `${size}px "${family} Bold"` : `${size}px "${family}"`
      total += ctx.measureText(`${w.text} `).width
    }
    return total
  }
  words.forEach((word, i) => {
    const item = { text: word, bold: i < 2 ? titleBold : bodyBold }
    if (line.length && widthOf([...line, item]) > maxWidth) flush()
    line.push(item)
  })
  flush()
  return cursor
}

function render({ label, style }) {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')
  const { layout, font, bg, fg } = style
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = fg
  ctx.strokeStyle = fg

  if (layout === 'classic') {
    ctx.lineWidth = 6
    ctx.strokeRect(30, 30, W - 60, H - 60)
  } else if (layout === 'modern') {
    ctx.fillRect(0, 0, W, 70)
  } else {
    ctx.lineWidth = 3
    ctx.strokeRect(40, 40, W - 80, H - 80)
  }

  const left = layout === 'modern'
  ctx.textAlign = left ? 'left' : 'center'
  const x = left ? MARGIN : W / 2
  // Shrinks the text until it fits inside the margins.
  const put = (text, y, size, bold = false) => {
    if (!text) return
    const face = bold ? `${font} Bold` : font
    ctx.font = `${size}px "${face}"`
    while (ctx.measureText(text).width > W - MARGIN * 2 && size > 12) ctx.font = `${--size}px "${face}"`
    ctx.fillText(text, x, y)
  }

  put(label.brand, 230, label.brand.length > 14 ? 76 : 92, true)
  put(label.classType, 360, 40)
  put(label.abv, 480, 46)
  put(label.netContents, 550, 46)
  put(label.bottler, 680, 28)
  put(label.country, 730, 28)

  if (label.warning) {
    ctx.textAlign = 'left'
    drawWarning(ctx, label.warning, MARGIN, 850, W - MARGIN * 2, style.warningSize ?? 22, font, (style.warningSize ?? 22) * 1.55, style.titleBold ?? true, style.bodyBold ?? false)
  }
  return canvas
}

function shrink(canvas, outputWidth) {
  const outputHeight = Math.round((H * outputWidth) / W)
  const small = createCanvas(outputWidth, outputHeight)
  const ctx = small.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0, 0, outputWidth, outputHeight)
  return small
}

mkdirSync('generated/labels', { recursive: true })
for (const spec of generated) {
  let canvas = render(spec)
  if (spec.style.outputWidth) canvas = shrink(canvas, spec.style.outputWidth)
  writeFileSync(`generated/labels/${spec.id}.png`, canvas.toBuffer('image/png'))
}

const entry = (s) => ({
  id: s.id,
  kind: s.kind,
  image: s.file ?? `generated/labels/${s.id}.png`,
  defect: s.defect ?? s.note ?? null,
  pixels: s.pixels ?? false,
  application: s.application,
  applicationText: s.applicationText,
  extraLines: s.extraLines,
  labelText: s.label ?? null,
  expected: s.expected,
})
// One paste-ready text file per label, so a person can try the same label in the app.
mkdirSync('tests/applications', { recursive: true })
for (const s of [...generated, ...samples, ...regression]) writeFileSync(`tests/applications/${s.id}.txt`, `${s.applicationText}\n`)
writeFileSync('tests/expected-results.json', `${JSON.stringify([...generated, ...samples, ...regression].map(entry), null, 2)}\n`)
console.log(`wrote ${generated.length} labels to generated/labels/ and tests/expected-results.json (${generated.length + samples.length + regression.length} entries)`)
