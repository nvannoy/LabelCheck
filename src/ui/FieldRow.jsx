import { WARNING_TEXT } from '../engine/warning.js'

const APPLICATION_KEY = { brand: 'brand', classType: 'classType', abv: 'abv', netContents: 'netContents', bottler: 'bottler', country: 'country' }

const valClass = (t) => `val${String(t).length > 24 ? ' long' : ''}`

function applicationSays(field, application) {
  if (field.id === 'warning') return `${WARNING_TEXT.slice(0, 70)}...`
  return application[APPLICATION_KEY[field.id]] || 'Not given'
}

// The government warning row: three short lines, one for each thing to know, and the
// required wording only when the wording is not an exact match.
const MARK = { match: '\u2713', check: '?', mismatch: '\u2715' }

function Line({ kind, label, children }) {
  return (
    <li className="wline">
      <span className={`mk ${kind}`} aria-hidden="true">{MARK[kind]}</span>
      <span><b>{label}:</b> {children}</span>
    </li>
  )
}

function WarningBody({ field }) {
  const bold = field.typography?.bold.status
  const boldLine = {
    bold: ['match', 'The title looks bold and the rest does not.'],
    'not-bold': ['mismatch', 'The title does not look bolder than the rest.'],
    unclear: ['check', 'The app cannot tell from this image. Check by eye.'],
  }[bold] ?? ['check', 'Check by eye.']
  return (
    <>
      <ul className="wlines">
        <Line kind={field.status} label="Wording">
          {field.status === 'match' ? 'Matches the statute word for word, and the title is in capital letters.' : field.reason}
        </Line>
        <Line kind={boldLine[0]} label="Title bold">{boldLine[1]}</Line>
        <Line kind="check" label="Legibility">Check by eye: readable, on a contrasting background, and separate from other text.</Line>
      </ul>
      {field.status !== 'match' && (
        <details className="required" open>
          <summary>Required wording (27 CFR 16.21)</summary>
          <p>{WARNING_TEXT}</p>
        </details>
      )}
      <details className="required">
        <summary>Rule</summary>
        <p>{field.rule}</p>
      </details>
    </>
  )
}

export default function FieldRow({ field, number, focused, preview, seen, application, rowRef, onFocus, onPreview }) {
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
        <div className="row-body"><WarningBody field={field} /></div>
      )}
      {focused && !(field.id === 'warning' && field.status !== 'na') && (
        <div className="row-body">
          {field.status !== 'na' && (
            <div className="compare">
              <div>
                <div className="cap">{field.id === 'warning' ? 'Statute requires' : 'Application says'}</div>
                <div className={valClass(applicationSays(field, application))}>{applicationSays(field, application)}</div>
              </div>
              <div className={differs ? 'differs' : ''}>
                <div className="cap">Label says</div>
                <div className={valClass(field.found)}>{field.found ? `${field.found.length > 90 ? `${field.found.slice(0, 90)}...` : field.found}${field.apart ? ' *' : ''}` : 'Nothing found'}</div>
              </div>
            </div>
          )}
          {field.apart && <p className="footnote">* The name and the address are printed in different places on the label. That is fine as long as both are there.</p>}
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
