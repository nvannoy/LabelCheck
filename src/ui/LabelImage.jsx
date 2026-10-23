import { useEffect, useRef, useState } from 'react'

const PAD = 5 // px of the original image around each box, so it does not clip the letters

// Shows the label and a numbered box for each field that was located.
// Boxes are drawn on a layer that exactly covers the fitted image.
export default function LabelImage({ src, width, height, fields, focusId, previewId, onFocus, onPreview, boxRefs }) {
  const holder = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = holder.current
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = size.w && size.h ? Math.min(size.w / width, size.h / height) : 0
  const fit = { width: width * scale, height: height * scale, left: (size.w - width * scale) / 2, top: (size.h - height * scale) / 2 }

  return (
    <div className="imagebox" ref={holder}>
      {scale > 0 && (
        <div className="fit" style={fit}>
          <img src={src} alt="The label under review" draggable="false" />
          {fields.map((f, i) => {
            if (!f.bbox || f.status === 'na') return null
            const x0 = Math.max(0, f.bbox.x0 - PAD), y0 = Math.max(0, f.bbox.y0 - PAD)
            const x1 = Math.min(width, f.bbox.x1 + PAD), y1 = Math.min(height, f.bbox.y1 + PAD)
            const kind = f.display.kind === 'na' ? 'check' : f.display.kind
            return (
              <button type="button" key={f.id} tabIndex={-1} ref={(el) => { boxRefs.current[f.id] = el }}
                aria-label={`Box ${i + 1}: ${f.label}, ${f.display.text}`}
                className={`box ${kind}${focusId === f.id || previewId === f.id ? ' focused' : ''}`}
                style={{ left: `${(x0 / width) * 100}%`, top: `${(y0 / height) * 100}%`, width: `${((x1 - x0) / width) * 100}%`, height: `${((y1 - y0) / height) * 100}%` }}
                onClick={() => onFocus(f.id)} onMouseEnter={() => onPreview(f.id)} onMouseLeave={() => onPreview(null)}>
                <span className="num" aria-hidden="true">{i + 1}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
