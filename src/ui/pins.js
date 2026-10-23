// Where to put the number badge for a box so it covers no printed text.
// Everything is in image pixels. The badge is a circle of `size` pixels. It is
// tried at six places just outside the box; the first one that touches no word
// is used, and if every place touches something, the one covering least.

function overlapArea(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  return w > 0 && h > 0 ? w * h : 0
}

export function placePin(box, size, words, image) {
  const gap = size * 0.15
  const midY = (box.y0 + box.y1) / 2 - size / 2
  const spots = [
    { x: box.x0 - size - gap, y: box.y0 - size },        // above, to the left
    { x: box.x0 - size - gap, y: midY },                  // left of the box
    { x: box.x1 + gap, y: box.y0 - size },                // above, to the right
    { x: box.x0 - size - gap, y: box.y1 + gap },          // below, to the left
    { x: box.x1 + gap, y: midY },                         // right of the box
    { x: box.x1 + gap, y: box.y1 + gap },                 // below, to the right
  ]
  let best = null
  for (const s of spots) {
    const rect = { x0: s.x, y0: s.y, x1: s.x + size, y1: s.y + size }
    // Count every word, including the field's own, because the badge must not cover any.
    const covered = words.reduce((sum, w) => sum + overlapArea(rect, w.bbox), 0)
    const outside = Math.max(0, -rect.x0) + Math.max(0, -rect.y0) + Math.max(0, rect.x1 - image.width) + Math.max(0, rect.y1 - image.height)
    const cost = covered + outside * size // leaving the image is allowed but a little costly
    if (!best || cost < best.cost) best = { ...s, cost }
    if (cost === 0) break
  }
  return { x: best.x, y: best.y }
}
