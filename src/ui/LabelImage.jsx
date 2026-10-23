import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { placePin } from './pins.js'

const PAD = 5 // px of the original image around each box, so it does not clip the letters
const LEVELS = [1, 1.5, 2, 3, 4, 6]
const PIN = 22 // badge size in screen pixels

// Shows the label and a numbered box for each field that was located.
// The image can be zoomed (buttons, or "Zoom to field") and dragged to pan, so
// small print such as the government warning can be read.
// Boxes are drawn on a layer that exactly covers the fitted, zoomed image.
export default function LabelImage({ src, width, height, words, fields, focusId, previewId, onFocus, onPreview, boxRefs }) {
  const holder = useRef(null)
  const scroller = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const pendingCenter = useRef(null) // field to scroll into the middle after a zoom

  useEffect(() => {
    const el = holder.current
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const base = size.w && size.h ? Math.min(size.w / width, size.h / height) : 0
  const fw = width * base * zoom
  const fh = height * base * zoom
  const canvasW = Math.max(size.w, fw)
  const canvasH = Math.max(size.h, fh)
  const fit = { width: fw, height: fh, left: (canvasW - fw) / 2, top: (canvasH - fh) / 2 }

  const focused = fields.find((f) => f.id === focusId)
  const canZoomToField = Boolean(focused?.bbox) && focused.status !== 'na'

  const centerOn = (id) => {
    const f = fields.find((x) => x.id === id)
    const sc = scroller.current
    if (!f?.bbox || !sc) return
    const cx = ((f.bbox.x0 + f.bbox.x1) / 2 / width) * fw + fit.left
    const cy = ((f.bbox.y0 + f.bbox.y1) / 2 / height) * fh + fit.top
    sc.scrollTo({ left: cx - sc.clientWidth / 2, top: cy - sc.clientHeight / 2 })
  }

  const step = (dir) => {
    const i = LEVELS.findIndex((l) => l >= zoom)
    setZoom(LEVELS[Math.max(0, Math.min(LEVELS.length - 1, i + dir))])
  }

  const zoomToField = () => {
    const b = focused.bbox
    const boxW = ((b.x1 - b.x0 + 2 * PAD) / width) * base * width // box width at zoom 1, in px
    const want = Math.min(LEVELS.at(-1), Math.max(1, (size.w * 0.8) / Math.max(boxW, 1)))
    pendingCenter.current = focused.id
    setZoom(want)
  }

  // After the new zoom is laid out, bring the field to the middle.
  useLayoutEffect(() => {
    if (pendingCenter.current) { centerOn(pendingCenter.current); pendingCenter.current = null }
  })

  // Keep the focused field in view when the keyboard or a click moves focus while zoomed.
  useEffect(() => {
    if (zoom > 1 && focused?.bbox) centerOn(focusId)
  }, [focusId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drag to pan. A click on a box still works because drags need movement first.
  const drag = useRef(null)
  const onPointerDown = (e) => {
    if (zoom === 1 || e.target.closest('button')) return
    drag.current = { x: e.clientX, y: e.clientY, left: scroller.current.scrollLeft, top: scroller.current.scrollTop }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    scroller.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x)
    scroller.current.scrollTop = drag.current.top - (e.clientY - drag.current.y)
  }
  const onPointerUp = () => { drag.current = null }

  return (
    <div className="imagebox" ref={holder}>
      <div className="scroller" ref={scroller} style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {base > 0 && (
          <div style={{ position: 'relative', width: canvasW, height: canvasH }}>
            <div className="fit" style={fit}>
              <img src={src} alt="The label under review" draggable="false" />
              {fields.map((f, i) => {
                if (!f.bbox || f.status === 'na') return null
                const x0 = Math.max(0, f.bbox.x0 - PAD), y0 = Math.max(0, f.bbox.y0 - PAD)
                const x1 = Math.min(width, f.bbox.x1 + PAD), y1 = Math.min(height, f.bbox.y1 + PAD)
                const kind = f.display.kind === 'na' ? 'check' : f.display.kind
                const on = focusId === f.id || previewId === f.id
                // The number sits just outside the box, where it covers no text.
                const pin = placePin({ x0, y0, x1, y1 }, PIN / (base * zoom), words, { width, height })
                return (
                  <div key={f.id}>
                    <button type="button" tabIndex={-1} ref={(el) => { boxRefs.current[f.id] = el }}
                      aria-label={`Box ${i + 1}: ${f.label}, ${f.display.text}`}
                      className={`box ${kind}${on ? ' focused' : ''}`}
                      style={{ left: `${(x0 / width) * 100}%`, top: `${(y0 / height) * 100}%`, width: `${((x1 - x0) / width) * 100}%`, height: `${((y1 - y0) / height) * 100}%` }}
                      onClick={() => onFocus(f.id)} onMouseEnter={() => onPreview(f.id)} onMouseLeave={() => onPreview(null)} />
                    <button type="button" tabIndex={-1} aria-hidden="true" className={`pin ${kind}${on ? ' focused' : ''}`}
                      style={{ left: `${(pin.x / width) * 100}%`, top: `${(pin.y / height) * 100}%` }}
                      onClick={() => onFocus(f.id)} onMouseEnter={() => onPreview(f.id)} onMouseLeave={() => onPreview(null)}>{i + 1}</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <div className="zoombar" role="group" aria-label="Zoom the label">
        <span className="level" role="status" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom out" onClick={() => step(-1)} disabled={zoom === LEVELS[0]}>&#8722;</button>
        <button type="button" aria-label="Zoom in" onClick={() => step(1)} disabled={zoom === LEVELS.at(-1)}>+</button>
        <span className="lab" aria-hidden="true">Zoom to:</span>
        <button type="button" aria-label="Zoom to fit the whole label" onClick={() => setZoom(1)} disabled={zoom === 1}>Fit</button>
        <button type="button" aria-label="Zoom to the focused field" onClick={zoomToField} disabled={!canZoomToField}>Field</button>
      </div>
    </div>
  )
}
