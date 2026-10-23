import { useEffect, useRef, useState } from 'react'
import { APPLICATION_FIELDS } from '../engine/parse.js'
import { isEditable } from './paste.js'

const LABELS = {
  brand: 'Brand name', classType: 'Class / type', abv: 'Alcohol content',
  netContents: 'Net contents', bottler: 'Bottler', country: 'Country of origin',
}

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`

function ImageStep({ intake }) {
  const { image, read, engine, onFile } = intake
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const pick = () => input.current?.click()

  let badge = null
  if (read.status === 'reading') badge = <span className="pill check" role="status"><span aria-hidden="true">?</span>Reading…</span>
  if (read.status === 'done' && read.closer) badge = <span className="pill check" role="status"><span aria-hidden="true">?</span>First read {seconds(read.ms)}, taking a closer look…</span>
  else if (read.status === 'done') badge = <span className="pill match"><span aria-hidden="true">&#10003;</span>Read in {seconds(read.ms)}</span>
  if (read.status === 'error') badge = <span className="pill mismatch"><span aria-hidden="true">&#10005;</span>Not read</span>

  return (
    <section className="step" aria-labelledby="step1">
      <div className="step-head">
        <span className="n" aria-hidden="true">1</span>
        <h2 id="step1">Label image</h2>
        {badge ?? <span className="aside">{engine === 'loading' ? 'Preparing the reader…' : 'Paste or drop'}</span>}
      </div>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0], 'chosen'); e.target.value = '' }} />
      {image ? (
        <div className="picked">
          <img src={image.url} alt="The label you chose" />
          <div className="meta">
            <b>{image.name}</b>
            <span>
              {image.source === 'pasted' ? 'Pasted from the clipboard. ' : image.source === 'dropped' ? 'Dropped here. ' : 'Chosen from your files. '}
              Reading started the moment it arrived.
            </span>
          </div>
          <button type="button" className="btn" onClick={pick}>Replace</button>
        </div>
      ) : (
        <div className={`drop${over ? ' over' : ''}`}
          onDragOver={() => setOver(true)} onDragLeave={() => setOver(false)} onDrop={() => setOver(false)}>
          <div>Just paste (Ctrl+V or Cmd+V) or drop the label image anywhere on this page</div>
          <div className="or">or</div>
          <button type="button" className="btn" onClick={pick}>Choose an image</button>
        </div>
      )}
      {read.status === 'error' && <div className="error" role="alert">{read.error}</div>}
      {read.status === 'done' && read.problems.map((p) => (
        <div className="warnbox" role="status" key={p}><span aria-hidden="true">? </span>{p} Confirm what it says by eye.</div>
      ))}
    </section>
  )
}

function FieldLine({ id, value, editing, setEditing, setValue }) {
  if (editing) {
    return (
      <div className="prow">
        <span className="sym" aria-hidden="true" />
        <label className="lab" htmlFor={`edit-${id}`}>{LABELS[id]}</label>
        <input id={`edit-${id}`} autoFocus defaultValue={value ?? ''}
          onKeyDown={(e) => { if (e.key === 'Enter') { setValue(id, e.currentTarget.value); setEditing(null) } if (e.key === 'Escape') setEditing(null) }}
          onBlur={(e) => { setValue(id, e.currentTarget.value); setEditing(null) }} />
      </div>
    )
  }
  return (
    <div className="prow">
      <span className="sym" style={{ color: value ? 'var(--green)' : 'var(--amber)' }} aria-hidden="true">{value ? '✓' : '?'}</span>
      <span className="lab">{LABELS[id]}</span>
      <span className={`val${value ? '' : ' missing'}`}>{value || 'Not found.'}</span>
      <button type="button" className="linkbtn" onClick={() => setEditing(id)} aria-label={`${value ? 'Edit' : 'Add'} ${LABELS[id]}`}>{value ? 'Edit' : 'Add'}</button>
    </div>
  )
}

function ApplicationStep({ intake }) {
  const { appText, setAppText, parsed, values, setValue, imported, setImported } = intake
  const [editing, setEditing] = useState(null)
  const count = APPLICATION_FIELDS.filter((id) => values[id]).length

  return (
    <section className="step plain" aria-labelledby="step2">
      <div className="step-head">
        <span className="n" aria-hidden="true">2</span>
        <h2 id="step2">Application text</h2>
        <span className="aside">Copy all, then just paste</span>
      </div>
      <label className="sr-only" htmlFor="apptext">Application text</label>
      <textarea id="apptext" className="apptext" value={appText} onChange={(e) => setAppText(e.target.value)}
        placeholder={'Brand Name: ...\nClass/Type: ...\nAlcohol Content: ...\nNet Contents: ...\nApplicant: ...'} />
      <div className="found" role="status">
        <span className={count === APPLICATION_FIELDS.length ? 'ok' : 'partial'}>Found {count} of {APPLICATION_FIELDS.length} fields.</span>
        {parsed.extra > 0 && <span className="extra">{parsed.extra} extra {parsed.extra === 1 ? 'line' : 'lines'} ignored.</span>}
      </div>
      <div className="parsed">
        {APPLICATION_FIELDS.filter((id) => id !== 'country').map((id) => (
          <FieldLine key={id} id={id} value={values[id]} editing={editing === id} setEditing={setEditing} setValue={setValue} />
        ))}
        <div className="country">
          <FieldLine id="country" value={values.country} editing={editing === 'country'} setEditing={setEditing} setValue={setValue} />
          <div className="prow" style={{ borderBottom: 0 }}>
            <span className="sym" aria-hidden="true" />
            <span className="lab" id="origin-label">Product is</span>
            <div className="toggle" role="group" aria-labelledby="origin-label">
              <button type="button" aria-pressed={!imported} onClick={() => setImported(false)}>Domestic</button>
              <button type="button" aria-pressed={imported} onClick={() => setImported(true)}>Imported</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Intake({ intake }) {
  const { read, count, onStart } = intake
  let why = 'Press Enter to start. The review opens at the size you last used.'
  let ready = true
  if (read.status === 'idle') { ready = false; why = 'Add a label image to start.' }
  else if (read.status === 'reading') { ready = false; why = 'Wait for the label to finish reading.' }
  else if (read.status === 'error') { ready = false; why = 'Replace the image to continue.' }
  else if (count === 0) { ready = false; why = 'Paste the application text to start.' }

  // Enter starts the review once it is ready, with nothing clicked first. In a text box
  // Enter still types a new line, so Ctrl or Cmd with Enter is used there. Enter on another
  // button still presses that button.
  useEffect(() => {
    if (!ready) return undefined
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.altKey || e.shiftKey) return
      const idle = e.target === document.body || e.target === document.documentElement
      if (idle || (isEditable(e.target) && (e.ctrlKey || e.metaKey))) { e.preventDefault(); onStart() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ready, onStart])

  return (
    <>
      <ImageStep intake={intake} />
      <ApplicationStep intake={intake} />
      <div className="start">
        <button type="button" className="btn-start" disabled={!ready} onClick={onStart}>Start review</button>
        <div className="why" role="status">{why}</div>
      </div>
    </>
  )
}
