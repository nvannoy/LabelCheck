import { useEffect, useRef, useState } from 'react'
import { draftNotes } from './notes.js'

export function DecisionBar({ choice, onChoose, confirming, flagged, onConfirm, onCancel, disabled }) {
  return (
    <>
      <div className="decision">
        <button type="button" className="btn-decide ok" disabled={disabled} aria-pressed={choice === 'verified'} onClick={() => onChoose('verified')}>Label verified</button>
        <button type="button" className="btn-decide bad" disabled={disabled} aria-pressed={choice === 'issues'} onClick={() => onChoose('issues')}>Issues found</button>
      </div>
      {confirming && (
        <div className="confirm" role="alertdialog" aria-labelledby="confirm-h">
          <p id="confirm-h"><strong>The app found {flagged} {flagged === 1 ? 'mismatch' : 'mismatches'} on this label.</strong> Mark it verified anyway?</p>
          <div className="actions">
            <button type="button" className="btn" autoFocus onClick={onCancel}>No, go back</button>
            <button type="button" className="btn" onClick={onConfirm}>Yes, mark verified</button>
          </div>
        </div>
      )}
    </>
  )
}

async function copyText(text, area) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    area?.select()
    return document.execCommand?.('copy') ?? false
  }
}

export function NotesPanel({ choice, fileName, fields, labelByEye, imageProblems, reviewed, onNext }) {
  const draft = draftNotes({ decision: choice, fileName, fields, labelByEye, imageProblems, reviewed })
  const [text, setText] = useState(draft)
  const [copied, setCopied] = useState(null)
  const [area, setArea] = useState(null)
  const section = useRef(null)

  // A new decision starts a fresh draft. Edits are kept while the decision stays the same.
  useEffect(() => { setText(draft); setCopied(null); section.current?.scrollIntoView?.({ block: 'nearest' }) }, [choice]) // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => setCopied(await copyText(text, area))

  return (
    <section className="notes" aria-labelledby="notes-h" ref={section}>
      <h2 id="notes-h">Notes</h2>
      <p>A draft from what the app found. Edit it, then copy it into the case. Nothing is sent anywhere.</p>
      <label className="sr-only" htmlFor="notes-text">Review notes</label>
      <textarea id="notes-text" ref={setArea} value={text} onChange={(e) => { setText(e.target.value); setCopied(null) }} />
      <div className="actions">
        <button type="button" className="btn primary" onClick={copy}>Copy notes</button>
        <button type="button" className="btn" onClick={onNext}>Next label</button>
        <span className="copied" role="status">{copied === true ? 'Copied' : copied === false ? 'Could not copy. Select the text and copy it.' : ''}</span>
      </div>
      <p style={{ marginTop: '0.5rem' }}>Next label clears the image, the application text and these notes.</p>
    </section>
  )
}
