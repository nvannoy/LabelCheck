import { WARNING_TEXT } from '../engine/warning.js'

const APPLICATION_KEY = { brand: 'brand', classType: 'classType', abv: 'abv', netContents: 'netContents', bottler: 'bottler', country: 'country' }

function applicationSays(field, application) {
  if (field.id === 'warning') return `${WARNING_TEXT.slice(0, 70)}...`
  return application[APPLICATION_KEY[field.id]] || 'Not given'
}

// The warning row says what the app could settle (the wording) and what only a
// person can (bold type, size, legibility), instead of showing the long statute.
const MARK = {
  bold: { bold: '\u2713', unclear: '?', 'not-bold': '\u2715' },
  size: { ok: '\u2713', close: '?', unknown: '?', small: '\u2715' },
  cpi: { ok: '\u2713', close: '?', unknown: '?', high: '\u2715' },
}
const KIND = { '\u2713': 'match', '?': 'check', '\u2715': 'mismatch' }

// What the app measured from the image about the warning's type, and a box for
// the label width that the size and characters-per-inch measurements need.
function Measured({ typography, labelWidth, setLabelWidth }) {
  const rows = typography && [
    ['Bold', MARK.bold[typography.bold.status], typography.bold.text],
    ['Type size', MARK.size[typography.size.status], typography.size.text],
    ['Characters per inch', MARK.cpi[typography.cpi.status], typography.cpi.text],
  ]
  return (
    <div className="measured">
      <strong>Measured from the image (estimates):</strong>
      {rows && (
        <ul>
          {rows.map(([name, mark, text]) => (
            <li key={name}><span className={`mk ${KIND[mark]}`} aria-hidden="true">{mark}</span><span><b>{name}:</b> {text}</span></li>
          ))}
        </ul>
      )}
      {!rows && <p>Measuring...</p>}
      <label className="width">
        Label width in inches{typography?.needsScale ? ' (needed for size)' : ''}:{' '}
        <input type="number" min="0.5" step="0.1" inputMode="decimal" value={labelWidth} onChange={(e) => setLabelWidth(e.target.value)} />
      </label>
      <p className="small">The width of the label that carries the warning, as printed. A picture has no real size, so type size and characters per inch need it. Good to about 20%.</p>
    </div>
  )
}

function WarningBody({ field, labelWidth, setLabelWidth }) {
  const mark = { match: '\u2713', check: '?', mismatch: '\u2715' }[field.status]
  const lead = field.status === 'match'
    ? 'Wording matches the statute word for word, and the title is in capital letters.'
    : field.reason
  return (
    <>
      <div className={`verdict ${field.status}`}>
        <span className="mark" aria-hidden="true">{mark}</span>
        <span><strong>Wording:</strong> {lead}</span>
      </div>
      {field.status !== 'match' && field.found && (
        <div className="compare"><div><div className="cap">Label says</div><div className="val small">{field.found.length > 160 ? `${field.found.slice(0, 160)}...` : field.found}</div></div></div>
      )}
      <Measured typography={field.typography} labelWidth={labelWidth} setLabelWidth={setLabelWidth} />
      <div className="byeye">
        <strong>Still to confirm by eye:</strong>
        <ul className="eyelist">{field.byEye.map((t) => <li key={t}><span aria-hidden="true">?</span>{t}</li>)}</ul>
      </div>
      <div className="note"><span className="i" aria-hidden="true">i</span><span>{field.rule}</span></div>
    </>
  )
}

export default function FieldRow({ field, number, focused, preview, seen, application, rowRef, onFocus, onPreview, labelWidth, setLabelWidth }) {
  const { display } = field
  const differs = field.status === 'mismatch'
  return (
    <div className={`row ${display.kind}${focused ? ' focused' : ''}${preview ? ' preview' : ''}`}
      onMouseEnter={() => onPreview(field.id)} onMouseLeave={() => onPreview(null)}>
      <button type="button" className="row-head" ref={rowRef} aria-expanded={focused}
        aria-label={`${number}. ${field.label}: ${display.text}${seen ? ', reviewed' : ''}`}
        onFocus={() => onFocus(field.id)} onClick={() => onFocus(field.id)}>
        <span className={`badge ${display.kind}`} aria-hidden="true">{number}</span>
        <span className="name" aria-hidden="true">{field.label}</span>
        {seen && <span className="seen" aria-hidden="true">Reviewed</span>}
        <span className={`pill ${display.kind}`} aria-hidden="true"><span>{display.symbol}</span>{display.text}</span>
      </button>
      {focused && field.id === 'warning' && field.status !== 'na' && (
        <div className="row-body"><WarningBody field={field} labelWidth={labelWidth} setLabelWidth={setLabelWidth} /></div>
      )}
      {focused && !(field.id === 'warning' && field.status !== 'na') && (
        <div className="row-body">
          {field.status !== 'na' && (
            <div className="compare">
              <div>
                <div className="cap">{field.id === 'warning' ? 'Statute requires' : 'Application says'}</div>
                <div className="val">{applicationSays(field, application)}</div>
              </div>
              <div className={differs ? 'differs' : ''}>
                <div className="cap">Label says</div>
                <div className="val">{field.found ? (field.found.length > 90 ? `${field.found.slice(0, 90)}...` : field.found) : 'Nothing found'}</div>
              </div>
            </div>
          )}
          <div className="note"><span className="i" aria-hidden="true">i</span>
            <span><strong>{field.reason}</strong><br />{field.rule}</span>
          </div>
          {field.byEye.length > 0 && (
            <div className="byeye">
              <strong>Only you can check:</strong>
              <ul>{field.byEye.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
