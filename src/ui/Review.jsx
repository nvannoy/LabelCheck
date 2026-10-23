import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TIERS, tierSummary } from './status.js'
import LabelImage from './LabelImage.jsx'
import FieldRow from './FieldRow.jsx'
import { DecisionBar, NotesPanel, ByEyePanel } from './Decision.jsx'
import { isEditable } from './paste.js'
import ReadTable from './ReadTable.jsx'

const FIELD_NAMES = { abv: 'alcohol content', netContents: 'net contents', brand: 'brand name', classType: 'class and type' }

const LEGEND = [
  ['match', 'Match', 'Solid green border and a check mark. The label agrees with the application.'],
  ['check', 'Check', 'Dashed amber border and a question mark. The app is not sure. Look at the label.'],
  ['mismatch', 'Mismatch', 'Thick red border and a cross. The label differs from the application.'],
  ['na', 'Not required', 'Gray and a dash. This field does not apply to this product.'],
]

// True on a window wide and tall enough for the two-column full layout.
function useWide() {
  const query = '(min-width: 1000px) and (min-height: 560px)'
  const [wide, setWide] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

export default function Review({ image, read, application, result, fields, mode, textScale, onNext, labelWidth, setLabelWidth }) {
  const full = mode === 'full'
  const wide = useWide()

  // First field to look at: the worst one.
  const firstId = (fields.find((f) => f.status === 'mismatch') ?? fields.find((f) => f.status === 'check') ?? fields[0]).id
  const [focusId, setFocusId] = useState(firstId)
  const [previewId, setPreviewId] = useState(null)
  const [seen, setSeen] = useState({})
  const [legend, setLegend] = useState(false)
  const [choice, setChoice] = useState(null) // the agent's decision; never set by the app

  const frame = useRef(null)
  const rowRefs = useRef({})
  const boxRefs = useRef({})
  const [path, setPath] = useState(null)

  const move = (from, step) => {
    const i = fields.findIndex((f) => f.id === from)
    const next = fields[(i + step + fields.length) % fields.length].id
    setFocusId(next)
    rowRefs.current[next]?.focus()
  }
  // The arrow keys and Enter work anywhere on the page, with nothing clicked first.
  // They are left alone while typing in a box (the notes) and when a modifier is held.
  // Enter on any other button still presses that button.
  const focusRef = useRef(focusId)
  focusRef.current = focusId
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isEditable(e.target)) return
      if (e.key === 'ArrowDown') { e.preventDefault(); move(focusRef.current, 1) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(focusRef.current, -1) }
      else if (e.key === 'Enter') {
        const idle = e.target === document.body || e.target === document.documentElement
        if (!idle && !e.target.closest?.('.row-head')) return
        e.preventDefault()
        const id = focusRef.current
        setSeen((s) => ({ ...s, [id]: true }))
        move(id, 1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }) // runs every render so move() always sees the current fields

  // Dotted connector from the focused (or previewed) row to its box on the label.
  const shownId = previewId ?? focusId
  useLayoutEffect(() => {
    const draw = () => {
      const root = frame.current?.getBoundingClientRect()
      const rowEl = rowRefs.current[shownId]
      const row = rowEl?.getBoundingClientRect()
      const box = boxRefs.current[shownId]?.getBoundingClientRect()
      if (!root || !row || !box) { setPath(null); return }
      // No line when either end has been scrolled or zoomed out of view.
      const inside = (r, area) => !area || (r.left + r.width / 2 >= area.left && r.left + r.width / 2 <= area.right && r.top + r.height / 2 >= area.top && r.top + r.height / 2 <= area.bottom)
      const view = boxRefs.current[shownId].closest('.scroller')?.getBoundingClientRect()
      const panel = rowEl.closest('.right')?.getBoundingClientRect()
      if (!inside(box, view) || !inside(row, panel)) { setPath(null); return }
      const twoColumns = row.left > box.right + 40
      const y = row.top + row.height / 2
      const by = box.top + box.height / 2
      const sx = (twoColumns ? row.left : row.right) - root.left
      const gx = twoColumns ? sx - 18 : root.width - 8
      setPath({ d: `M ${sx} ${y - root.top} H ${gx} V ${by - root.top} H ${box.right - root.left}`, cx: box.right - root.left, cy: by - root.top, kind: fields.find((f) => f.id === shownId).display.kind })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(frame.current)
    window.addEventListener('resize', draw)
    // Scroll events do not bubble, so listen in the capture phase to hear the
    // image scroller and the check panel.
    const root = frame.current
    root.addEventListener('scroll', draw, true)
    return () => { ro.disconnect(); window.removeEventListener('resize', draw); root.removeEventListener('scroll', draw, true) }
  }, [shownId, textScale, fields, full])

  // Keep the focused row in view when the keyboard moves it.
  useEffect(() => { rowRefs.current[focusId]?.scrollIntoView?.({ block: 'nearest' }) }, [focusId])

  const tier = TIERS[result.tier]
  const color = { reject: 'var(--red)', review: 'var(--amber)', ready: 'var(--green)' }[result.tier]

  return (
    <div ref={frame} className="reviewpane" style={{ position: 'relative' }}>
      {!full && (
        <div className={`tier ${result.tier}`} role="status">
          <span className="icon" aria-hidden="true">{tier.symbol}</span>
          <span className="name">{tier.name}</span>
          <span className="sub">{tierSummary(result)}</span>
        </div>
      )}
      {read.closer && (
        <div className="closer" role="status">
          <span aria-hidden="true">? </span>Taking a closer look at the label. Results for {read.closer.map((id) => FIELD_NAMES[id] ?? id).join(', ')} may change in a moment.
        </div>
      )}
      <div className="cols">
        <div className="left">
          <LabelImage src={image.url} width={read.result.quality.width} height={read.result.quality.height} words={read.result.words} fields={fields}
            focusId={focusId} previewId={previewId} onFocus={setFocusId} onPreview={setPreviewId} boxRefs={boxRefs} />
          {full && wide && <ReadTable fields={fields} />}
        </div>
        <div className="right">
          <div className="rows" role="list" aria-label="Fields">
            {fields.map((f, i) => (
              <div role="listitem" key={f.id}>
                <FieldRow field={f} number={i + 1} focused={focusId === f.id} preview={previewId === f.id} seen={seen[f.id]}
                  application={application} labelWidth={labelWidth} setLabelWidth={setLabelWidth} rowRef={(el) => { rowRefs.current[f.id] = el }}
                  onFocus={setFocusId} onPreview={setPreviewId} />
              </div>
            ))}
          </div>
          {legend && <Legend />}
          {full && !wide && <ReadTable fields={fields} />}
          <ByEyePanel fields={fields} labelByEye={result.labelByEye} />
          <DecisionBar choice={choice} onChoose={setChoice} />
          {choice && (
            <NotesPanel choice={choice} fileName={image.name} fields={fields} labelByEye={result.labelByEye}
              imageProblems={result.imageProblems} reviewed={seen} onNext={onNext} />
          )}
        </div>
      </div>
      <Hint legend={legend} setLegend={setLegend} full={full} />
      {path && (
        <svg className="connector" aria-hidden="true">
          <path d={path.d} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="2 6" strokeLinecap="round" />
          <circle cx={path.cx} cy={path.cy} r="3.5" fill={color} />
        </svg>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="legend" role="region" aria-label="What the colors and symbols mean">
      {LEGEND.map(([kind, name, text]) => (
        <div key={kind}><span className={`pill ${kind}`}><span aria-hidden="true">{{ match: '\u2713', check: '?', mismatch: '\u2715', na: '\u2013' }[kind]}</span>{name}</span><span>{text}</span></div>
      ))}
    </div>
  )
}

function Hint({ legend, setLegend, full }) {
  return (
    <div className={`hint${full ? ' bottom' : ''}`}>
      <span>{full
        ? '\u2191 \u2193 or Tab moves to the next field, with no click needed. Enter marks it reviewed. Hover over a box on the label to preview that field.'
        : '\u2191 \u2193 or Tab: next field. Enter marks it reviewed.'}</span>
      <button type="button" className="iconbtn" aria-label="What do the colors and symbols mean?" aria-expanded={legend} onClick={() => setLegend((v) => !v)}>i</button>
    </div>
  )
}
