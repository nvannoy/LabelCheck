import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTextSize } from './useTextSize.js'
import Header, { Footer } from './Header.jsx'
import Intake from './Intake.jsx'
import Review from './Review.jsx'
import { startWorker, readImage } from '../ocr/ocr.js'
import { parseApplication, importedFromCountry, APPLICATION_FIELDS } from '../engine/parse.js'
import { checkLabel, qualityProblems } from '../engine/check.js'
import { rowStatus, TIERS, tierSummary } from './status.js'

const NOT_AN_IMAGE = 'That file is not an image. Choose a PNG, JPG or similar picture of the label.'
const NOTHING_READ = 'Nothing could be read from this image. Try a clearer or larger picture of the label.'
const READ_FAILED = 'The label could not be read. Try the image again, or a different one.'

const EMPTY_READ = { status: 'idle' }

export default function App() {
  const textSize = useTextSize()
  const [engine, setEngine] = useState('loading')
  const worker = useRef(null)
  const ready = useRef(null)
  const current = useRef(0) // read counter so a replaced image's late result is ignored

  const [image, setImage] = useState(null)
  const [read, setRead] = useState(EMPTY_READ)
  const [appText, setAppText] = useState('')
  const [edits, setEdits] = useState({})
  const [importedChoice, setImportedChoice] = useState(null)
  const [screen, setScreen] = useState('intake')
  const [mode, setMode] = useState('compact') // compact column, or full (fullscreen, two columns)

  // The engine starts loading as the page opens, so it is ready when the image arrives.
  useEffect(() => {
    ready.current = startWorker()
    ready.current.then((w) => { worker.current = w; setEngine('ready') }).catch(() => setEngine('error'))
    return () => { ready.current?.then((w) => w.terminate()).catch(() => {}) }
  }, [])

  // Full mode asks the browser for full screen. If the agent leaves it with Esc,
  // the layout goes back to compact. Where the API is missing, only the layout changes.
  const modeRef = useRef(mode)
  modeRef.current = mode
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement && modeRef.current === 'full') setMode('compact') }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const enterFull = useCallback(async () => {
    setMode('full')
    try { await document.documentElement.requestFullscreen?.() } catch { /* stay in the full layout without fullscreen */ }
  }, [])
  const leaveFull = useCallback(async () => {
    setMode('compact')
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* already out */ }
  }, [])

  const reset = useCallback(() => {
    leaveFull()
    current.current++
    setImage((old) => { if (old) URL.revokeObjectURL(old.url); return null })
    setRead(EMPTY_READ)
    setAppText('')
    setEdits({})
    setImportedChoice(null)
    setScreen('intake')
  }, [leaveFull])

  const onFile = useCallback(async (file, source) => {
    const id = ++current.current
    if (!file.type.startsWith('image/')) {
      setImage(null)
      setRead({ status: 'error', error: NOT_AN_IMAGE })
      return
    }
    setImage((old) => { if (old) URL.revokeObjectURL(old.url); return { name: file.name || 'pasted-image.png', url: URL.createObjectURL(file), source, file } })
    setRead({ status: 'reading' })
    try {
      const w = await ready.current
      const readable = (r) => r.words.filter((x) => x.text.trim().length > 1).length >= 3
      // First pass result arrives early when a slower second look is needed.
      const early = (r) => {
        if (id !== current.current || !readable(r)) return
        setRead({ status: 'done', ms: r.ms, result: r, problems: qualityProblems(r.quality), closer: r.secondPass.missing })
      }
      const result = await readImage(w, file, { onFirstPass: early })
      if (id !== current.current) return
      if (!readable(result)) {
        setRead({ status: 'error', error: NOTHING_READ })
        return
      }
      setRead({ status: 'done', ms: result.ms, result, problems: qualityProblems(result.quality), closer: null })
    } catch {
      if (id === current.current) setRead({ status: 'error', error: READ_FAILED })
    }
  }, [])

  // Paste anywhere on the intake screen.
  useEffect(() => {
    if (screen !== 'intake') return undefined
    const onPaste = (e) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) { e.preventDefault(); onFile(file, 'pasted') }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [screen, onFile])

  const parsed = useMemo(() => parseApplication(appText), [appText])
  const values = useMemo(() => ({ ...parsed.fields, ...edits }), [parsed, edits])
  const imported = importedChoice ?? importedFromCountry(values.country)
  const count = APPLICATION_FIELDS.filter((id) => values[id]).length
  const application = useMemo(() => {
    const a = { ...values, imported }
    if (!imported) delete a.country
    return a
  }, [values, imported])

  const review = useMemo(() => {
    if (screen !== 'review' || read.status !== 'done') return null
    const result = checkLabel({ words: read.result.words, application, quality: read.result.quality })
    return { result, fields: result.fields.map((f) => ({ ...f, display: rowStatus(f) })) }
  }, [screen, read, application])

  const intake = {
    engine, image, read, onFile, appText, setAppText, parsed, values, count, imported,
    setValue: (id, v) => setEdits((e) => ({ ...e, [id]: v.trim() })),
    setImported: setImportedChoice,
    onStart: () => setScreen('review'),
  }

  return (
    <div className={`app${mode === 'full' && review ? ' fullmode' : ''}`}>
      <div className={`frame ${mode === 'full' && review ? 'full' : 'compact'}`}>
        <Header textSize={textSize} middle={mode === 'full' && review && <TierChip result={review.result} />}>
          {review && (mode === 'full'
            ? <button type="button" className="btn-onblue solid" onClick={leaveFull}>Compact view</button>
            : <button type="button" className="btn-onblue solid" onClick={enterFull}><span aria-hidden="true">&#x26F6;</span> Full screen</button>)}
          <button type="button" className="btn-onblue" onClick={reset}>Next label</button>
        </Header>
        {screen === 'intake' && <Intake intake={intake} />}
        {review && <Review image={image} read={read} application={application} result={review.result} fields={review.fields} mode={mode} textScale={textSize.scale} onNext={reset} />}
      </div>
      <Footer wide={mode === 'full' && Boolean(review)} />
    </div>
  )
}

function TierChip({ result }) {
  const tier = TIERS[result.tier]
  return (
    <div className={`chip ${result.tier}`} role="status">
      <span aria-hidden="true">{tier.symbol}</span>{tier.name}<span className="sub">{tierSummary(result)}</span>
    </div>
  )
}
