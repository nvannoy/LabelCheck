// Draws one fictional distilled spirits label for the Phase 0 OCR check.
// Fictional brand only. Output goes to generated/, which is not committed.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'

GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Georgia.ttf', 'Georgia')
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Georgia Bold.ttf', 'GeorgiaBold')

const W = 900, H = 1200
const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#f4ecd8'
ctx.fillRect(0, 0, W, H)
ctx.strokeStyle = '#4a3b22'
ctx.lineWidth = 6
ctx.strokeRect(30, 30, W - 60, H - 60)
ctx.fillStyle = '#2b1f0e'
ctx.textAlign = 'center'

const line = (text, y, font) => { ctx.font = font; ctx.fillText(text, W / 2, y) }
line("OLD TOM'S", 200, '88px GeorgiaBold')
line('DISTILLERY', 290, '60px GeorgiaBold')
line('Kentucky Straight Bourbon Whiskey', 400, '40px Georgia')
line('45% Alc./Vol. (90 Proof)', 520, '38px Georgia')
line('750 mL', 590, '38px Georgia')
line('Distilled and Bottled by Old Tom\'s Distillery', 720, '28px Georgia')
line('Bardstown, Kentucky', 760, '28px Georgia')

ctx.textAlign = 'left'
ctx.font = '22px GeorgiaBold'
const warning = [
  ['GOVERNMENT WARNING: (1) According to the Surgeon General, women should', 'GeorgiaBold'],
  ['not drink alcoholic beverages during pregnancy because of the risk of birth', 'Georgia'],
  ['defects. (2) Consumption of alcoholic beverages impairs your ability to drive a', 'Georgia'],
  ['car or operate machinery, and may cause health problems.', 'Georgia'],
]
warning.forEach(([t, f], i) => { ctx.font = `22px ${f}`; ctx.fillText(t, 70, 900 + i * 34) })

mkdirSync('generated', { recursive: true })
writeFileSync('generated/probe-label.png', canvas.toBuffer('image/png'))
console.log('wrote generated/probe-label.png')
