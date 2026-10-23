// Builds OCR-style words from plain text so engine tests need no OCR.
export function wordsFrom(text, confidence = 96) {
  let x = 0
  return text.split(/\s+/).filter(Boolean).map((t) => {
    const w = { text: t, confidence, bbox: { x0: x, y0: 0, x1: x + t.length * 10, y1: 20 } }
    x += t.length * 10 + 10
    return w
  })
}

export const APP = {
  brand: 'Harlan Ridge', classType: 'Kentucky Straight Bourbon Whiskey', abv: '45% Alc./Vol.',
  netContents: '750 mL', bottler: 'Harlan Ridge Distilling Co., Bardstown, KY', imported: false, country: null,
}
