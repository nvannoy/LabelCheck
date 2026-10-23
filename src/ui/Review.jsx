import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { checkLabel } from '../engine/check.js'
import { rowStatus, TIERS, tierSummary } from './status.js'
import LabelImage from './LabelImage.jsx'
import FieldRow from './FieldRow.jsx'
import { DecisionBar, NotesPanel, ByEyePanel } from './Decision.jsx'

const LEGEND = [
  ['match', 'Match', 'Solid green border and a check mark. The label agrees with the application.'],
  ['check', 'Check', 'Dashed amber border and a question mark. The app is not sure. Look at the label.'],
  ['mismatch', 'Mismatch', 'Thick red border and a cross. The label differs from the application.'],
  ['na', 'Not required', 'Gray and a dash. This field does not apply to this product.'],
]

export default function Review({ image, read, application, textScale, onNext }) {
  const result = useMemo(
    () => checkLabel({ words: read.result.words, application, quality: read.result.quality }),
    [read, application],
  )
  const fields = useMemo(() => result.fields.map((f) => ({ ...f, display: rowStatus(f) })), [result])

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
  const onKeyDown = (id) => (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(id, 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(id, -1) }
    else if (e.key === 'Enter') { e.preventDefault(); setSeen((s) => ({ ...s, [id]: true })); move(id, 1) }
  }

  // Dotted connector from the focused (or previewed) row to its box on the label.
  const shownId = previewId ?? focusId
  useLayoutEffect(() => {
    const draw = () => {
      const root = frame.current?.getBoundingClientRect()
      const row = rowRefs.current[shownId]?.getBoundingClientRect()
      const box = boxRefs.current[shownId]?.getBoundingClientRect()
      if (!root || !row || !box) { setPath(null); return }
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
    return () => { ro.disconnect(); window.removeEventListener('resize', draw) }
  }, [shownId, textScale, fields])

  // Keep the focused row in view when the keyboard moves it.
  useEffect(() => { rowRefs.current[focusId]?.scrollIntoView?.({ block: 'nearest' }) }, [focusId])

  const tier = TIERS[result.tier]
  const color = { reject: 'var(--red)', review: 'var(--amber)', ready: 'var(--green)' }[result.tier]

  return (
    <div ref={frame} style={{ position: 'relative' }}>
      <div className={`tier ${result.tier}`} role="status">
        <span className="icon" aria-hidden="true">{tier.symbol}</span>
        <span className="name">{tier.name}</span>
        <span className="sub">{tierSummary(result)}</span>
      </div>
      <div className="cols">
        <LabelImage src={image.url} width={read.result.quality.width} height={read.result.quality.height} fields={fields}
          focusId={focusId} previewId={previewId} onFocus={setFocusId} onPreview={setPreviewId} boxRefs={boxRefs} />
        <div>
          <div className="rows" role="list" aria-label="Fields">
            {fields.map((f, i) => (
              <div role="listitem" key={f.id}>
                <FieldRow field={f} number={i + 1} focused={focusId === f.id} preview={previewId === f.id} seen={seen[f.id]}
                  application={application} rowRef={(el) => { rowRefs.current[f.id] = el }}
                  onFocus={setFocusId} onPreview={setPreviewId} onKeyDown={onKeyDown(f.id)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {legend && (
        <div className="legend" role="region" aria-label="What the colors and symbols mean">
          {LEGEND.map(([kind, name, text]) => (
            <div key={kind}><span className={`pill ${kind}`}><span aria-hidden="true">{{ match: '✓', check: '?', mismatch: '✕', na: '–' }[kind]}</span>{name}</span><span>{text}</span></div>
          ))}
        </div>
      )}
      <div className="hint">
        <span>Tab or &#8593; &#8595; next field. Enter marks it reviewed.</span>
        <button type="button" className="iconbtn" aria-label="What do the colors and symbols mean?" aria-expanded={legend} onClick={() => setLegend((v) => !v)}>i</button>
      </div>
      <ByEyePanel fields={fields} labelByEye={result.labelByEye} />
      <DecisionBar choice={choice} onChoose={setChoice} />
      {choice && (
        <NotesPanel choice={choice} fileName={image.name} fields={fields} labelByEye={result.labelByEye}
          imageProblems={result.imageProblems} reviewed={seen} onNext={onNext} />
      )}
      {path && (
        <svg className="connector" aria-hidden="true">
          <path d={path.d} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="2 6" strokeLinecap="round" />
          <circle cx={path.cx} cy={path.cy} r="3.5" fill={color} />
        </svg>
      )}
    </div>
  )
}
