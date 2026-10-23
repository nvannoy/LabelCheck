import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const GAP = 12 // px between the spotlight and the card

// A guided tour: a dimmed page, a spotlight on one part of the screen, and a card that
// explains it. Skip or Esc ends it at any step. Nothing is stored, so it opens again
// the next time the app opens.
export default function Tour({ steps, step, onNext, onBack, onClose }) {
  const s = steps[step]
  const last = step === steps.length - 1
  const card = useRef(null)
  const primary = useRef(null)
  const [box, setBox] = useState(null) // the spotlight, in screen pixels
  const [place, setPlace] = useState({ left: 0, top: 0, visible: false })

  // Find what to point at. The screen behind can still be changing (the sample loads, the
  // review opens), so keep looking while the step is showing and follow it if it moves.
  useLayoutEffect(() => {
    let seen = null
    const measure = () => {
      const el = s.target ? document.querySelector(s.target) : null
      if (!el) { if (seen) { seen = null; setBox(null) } return }
      const r = el.getBoundingClientRect()
      const next = r.width && r.height ? { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } : null
      if (JSON.stringify(next) === JSON.stringify(seen)) return
      if (!seen) el.scrollIntoView?.({ block: 'nearest' })
      seen = next
      setBox(next)
    }
    setBox(null)
    measure()
    const timer = setInterval(measure, 200)
    window.addEventListener('resize', measure)
    return () => { clearInterval(timer); window.removeEventListener('resize', measure) }
  }, [s])

  // Put the card next to the spotlight, inside the window.
  useLayoutEffect(() => {
    const c = card.current
    if (!c) return
    const w = c.offsetWidth, h = c.offsetHeight
    const vw = window.innerWidth, vh = window.innerHeight
    if (!box) { setPlace({ left: (vw - w) / 2, top: Math.max(16, (vh - h) / 2), visible: true }); return }
    // Use the side with room for the card, and the roomier one when both fit, so the card
    // does not sit on top of what it is describing.
    const spaceBelow = vh - (box.top + box.height) - GAP - 8
    const spaceAbove = box.top - GAP - 8
    let top
    if (h <= spaceBelow && h <= spaceAbove) top = spaceAbove > spaceBelow ? box.top - GAP - h : box.top + box.height + GAP
    else if (h <= spaceBelow) top = box.top + box.height + GAP
    else if (h <= spaceAbove) top = box.top - GAP - h
    else top = 8 // the target fills the screen: sit at the top
    const left = Math.min(Math.max(8, box.left), vw - w - 8)
    setPlace({ left, top, visible: true })
  }, [box, step])

  // Focus the main button once the card is showing (a hidden element cannot take focus).
  useEffect(() => { if (place.visible) primary.current?.focus() }, [step, place.visible])

  // Keys belong to the tour while it is open. The listener runs first and stops the keys from
  // reaching the screen behind it (the arrow keys and Enter move through the review).
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const onButton = e.target.closest?.('button')
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return }
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !onButton)) { e.preventDefault(); e.stopPropagation(); onNext(); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); onBack(); return }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || (e.key === 'Enter' && onButton)) e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onNext, onBack, onClose])

  return (
    <div className="tour" role="presentation">
      <div className="tour-block" onClick={(e) => e.stopPropagation()} />
      {box && <div className="tour-spot" style={{ left: box.left - 6, top: box.top - 6, width: box.width + 12, height: box.height + 12 }} />}
      {!box && <div className="tour-dim" />}
      <section ref={card} className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-h" aria-describedby="tour-t"
        style={{ left: place.left, top: place.top, visibility: place.visible ? 'visible' : 'hidden' }}>
        <div className="tour-count" aria-hidden="true">Step {step + 1} of {steps.length}</div>
        <h2 id="tour-h">{s.title}</h2>
        <p id="tour-t">{s.text}</p>
        <div className="tour-actions">
          <button type="button" className="btn" onClick={onClose}>{last ? 'Close' : 'Skip tour'}</button>
          <span className="spacer" />
          {step > 0 && <button type="button" className="btn" onClick={onBack}>Back</button>}
          <button type="button" className="btn primary" ref={primary} onClick={last ? onClose : onNext}>{last ? 'Start with my own label' : step === 0 ? 'Start the tour' : 'Next'}</button>
        </div>
      </section>
    </div>
  )
}
