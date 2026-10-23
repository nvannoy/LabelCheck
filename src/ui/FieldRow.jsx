import { WARNING_TEXT } from '../engine/warning.js'

const APPLICATION_KEY = { brand: 'brand', classType: 'classType', abv: 'abv', netContents: 'netContents', bottler: 'bottler', country: 'country' }

function applicationSays(field, application) {
  if (field.id === 'warning') return `${WARNING_TEXT.slice(0, 70)}...`
  return application[APPLICATION_KEY[field.id]] || 'Not given'
}

// The warning row says what the app could settle (the wording) and what only a
// person can (bold type, size, legibility), instead of showing the long statute.
function WarningBody({ field }) {
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
      <div className="byeye">
        <strong>Still to confirm by eye:</strong>
        <ul className="eyelist">{field.byEye.map((t) => <li key={t}><span aria-hidden="true">?</span>{t}</li>)}</ul>
      </div>
      <div className="note"><span className="i" aria-hidden="true">i</span><span>{field.rule}</span></div>
    </>
  )
}

export default function FieldRow({ field, number, focused, preview, seen, application, rowRef, onFocus, onPreview, onKeyDown }) {
  const { display } = field
  const differs = field.status === 'mismatch'
  return (
    <div className={`row ${display.kind}${focused ? ' focused' : ''}${preview ? ' preview' : ''}`}
      onMouseEnter={() => onPreview(field.id)} onMouseLeave={() => onPreview(null)}>
      <button type="button" className="row-head" ref={rowRef} aria-expanded={focused}
        aria-label={`${number}. ${field.label}: ${display.text}${seen ? ', reviewed' : ''}`}
        onFocus={() => onFocus(field.id)} onClick={() => onFocus(field.id)} onKeyDown={onKeyDown}>
        <span className={`badge ${display.kind}`} aria-hidden="true">{number}</span>
        <span className="name" aria-hidden="true">{field.label}</span>
        {seen && <span className="seen" aria-hidden="true">Reviewed</span>}
        <span className={`pill ${display.kind}`} aria-hidden="true"><span>{display.symbol}</span>{display.text}</span>
      </button>
      {focused && field.id === 'warning' && field.status !== 'na' && (
        <div className="row-body"><WarningBody field={field} /></div>
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
