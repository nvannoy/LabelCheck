import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTextSize } from './useTextSize.js'
import Header, { Footer } from './Header.jsx'
import Intake from './Intake.jsx'
import Review from './Review.jsx'
import { startWorker, readImage, makeCanvas } from '../ocr/ocr.js'
import { measureWarning } from '../ocr/measure.js'
import { parseApplication, importedFromCountry, APPLICATION_FIELDS } from '../engine/parse.js'
import { checkLabel, qualityProblems } from '../engine/check.js'
import { checkWarning } from '../engine/warning.js'
import { classifyPaste, classifyDrop, isEditable } from './paste.js'
import { rowStatus, TIERS, CHECKING, tierSummary } from './status.js'
import Tour from '../tour/Tour.jsx'
import { TOUR_STEPS } from '../tour/steps.js'
import { SAMPLE_READ, SAMPLE_TEXT, sampleFile } from '../tour/sample.js'

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
  const [helpOpen, setHelpOpen] = useState(false) // full mode: keyboard hints and the symbol legend
  const [mode, setMode] = useState('compact') // compact column, or full (fullscreen, two columns)
  const [tour, setTour] = useState({ step: 0 }) // the tour opens every time the app opens; nothing is stored
  const tourRef = useRef(tour)
  tourRef.current = tour
  const demoRef = useRef(false) // true while the sample label is loaded for the tour

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
    setMeasured(null)
    demoRef.current = false
    setScreen('intake')
  }, [leaveFull])

  // The tour works on a made-up sample label, loaded as if it had been pasted and read.
  const showSample = useCallback(async () => {
    const file = await sampleFile()
    current.current++
    demoRef.current = true
    setImage((old) => { if (old) URL.revokeObjectURL(old.url); return { name: file.name, url: URL.createObjectURL(file), source: 'sample', file } })
    setRead({
      status: 'done', ms: 0, sample: true, closer: null, problems: qualityProblems(SAMPLE_READ.quality),
      result: { ...SAMPLE_READ, ms: 0, secondPass: { ran: false, missing: [], added: 0, ms: 0 } },
    })
    setAppText(SAMPLE_TEXT)
    setEdits({})
    setImportedChoice(null)
  }, [])

  // Closing the tour removes the sample and leaves the app empty and ready for a real label.
  const closeTour = useCallback(() => {
    setTour(null)
    if (demoRef.current) reset()
  }, [reset])
  const nextStep = useCallback(() => setTour((t) => (t ? { step: Math.min(t.step + 1, TOUR_STEPS.length - 1) } : t)), [])
  const backStep = useCallback(() => setTour((t) => (t ? { step: Math.max(t.step - 1, 0) } : t)), [])

  // Each step brings the screen it talks about.
  const tourStep = tour?.step
  useEffect(() => {
    if (tourStep === undefined) return undefined
    const s = TOUR_STEPS[tourStep]
    let alive = true
    ;(async () => {
      if (s.sample && !demoRef.current) await showSample()
      if (alive) setScreen(s.sample ? s.screen : 'intake')
    })()
    return () => { alive = false }
  }, [tourStep, showSample])

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

  const [notice, setNotice] = useState(null)
  const noticeTimer = useRef(null)
  const say = useCallback((text) => {
    setNotice(text)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 5000)
  }, [])

  // New application text replaces the old text, and the edits and the
  // Domestic or Imported choice made for the old one.
  const takeText = useCallback((text) => {
    setAppText(text)
    setEdits({})
    setImportedChoice(null)
    const { found } = parseApplication(text)
    say(`Pasted application text. Found ${found} of ${APPLICATION_FIELDS.length} fields.`)
  }, [say])

  const take = useCallback((item) => {
    if (!item) return
    if (tourRef.current) closeTour() // pasting a real label ends the tour
    if (item.kind === 'image') { onFile(item.file, 'pasted'); say('Pasted the label image. Reading started.') }
    else takeText(item.text)
  }, [onFile, say, takeText, closeTour])

  // Paste or drop anywhere on the intake screen: the app tells an image from
  // text, so nothing needs a click first. A paste into a box being typed in
  // (an Edit field) is left alone.
  useEffect(() => {
    if (screen !== 'intake') return undefined
    const onPaste = (e) => {
      if (isEditable(e.target)) return
      const item = classifyPaste(e.clipboardData)
      if (item) { e.preventDefault(); take(item) }
    }
    const onDragOver = (e) => e.preventDefault()
    const onDrop = async (e) => {
      e.preventDefault()
      take(await classifyDrop(e.dataTransfer))
    }
    document.addEventListener('paste', onPaste)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [screen, take])

  const parsed = useMemo(() => parseApplication(appText), [appText])
  const values = useMemo(() => ({ ...parsed.fields, ...edits }), [parsed, edits])
  const imported = importedChoice ?? importedFromCountry(values.country)
  const count = APPLICATION_FIELDS.filter((id) => values[id]).length
  const application = useMemo(() => {
    const a = { ...values, imported }
    if (!imported) delete a.country
    return a
  }, [values, imported])

  // The warning's words, found as soon as the label is read (they do not depend on the
  // application), so the title can be checked for bold before the review opens.
  const warningWords = useMemo(
    () => (read.status === 'done' && !read.closer ? checkWarning(read.result.words).statementWords ?? null : null),
    [read],
  )

  // Then check from the image whether the warning title is bold. It can only make the result
  // worse. The result for that moment is "Checking", never "Ready to approve", so a label with
  // a bad title is not shown as approvable while this runs.
  const [measured, setMeasured] = useState(null) // { for: the words measured, value: the measurement or null }
  useEffect(() => {
    if (!warningWords || !image?.file) { setMeasured(null); return undefined }
    let alive = true
    ;(async () => {
      let value = null
      try {
        const bitmap = await createImageBitmap(image.file)
        try {
          value = measureWarning({ source: bitmap, width: bitmap.width, height: bitmap.height, makeCanvas, statementWords: warningWords, quality: read.result.quality })
        } finally { bitmap.close() }
      } catch { /* no measurement: the agent checks the title by eye */ }
      if (alive) setMeasured({ for: warningWords, value })
    })()
    return () => { alive = false }
  }, [warningWords, image, read])
  const checking = Boolean(warningWords) && measured?.for !== warningWords

  const review = useMemo(() => {
    if (screen !== 'review' || read.status !== 'done') return null
    const result = checkLabel({ words: read.result.words, application, quality: read.result.quality, typography: measured?.value ?? null })
    return { result, fields: result.fields.map((f) => ({ ...f, display: rowStatus(f) })) }
  }, [screen, read, application, measured])

  const intake = {
    engine, image, read, onFile, appText, setAppText, parsed, values, count, imported,
    setValue: (id, v) => setEdits((e) => ({ ...e, [id]: v.trim() })),
    setImported: setImportedChoice,
    onStart: () => setScreen('review'),
  }

  const tourFocus = tour ? TOUR_STEPS[tour.step].focus ?? null : null

  return (
    <>
    <div className={`app${review ? ' fixed' : ''}${mode === 'full' && review ? ' fullmode' : ''}`} inert={tour ? true : undefined}>
      <div className={`frame ${mode === 'full' && review ? 'full' : 'compact'}`}>
        <Header textSize={textSize} stacked={!(review && mode === 'full')} middle={mode === 'full' && review && <TierChip result={review.result} checking={checking} />}>
          {review && mode === 'full' && <button type="button" className="btn-onblue" aria-expanded={helpOpen} aria-controls="help-pop" onClick={() => setHelpOpen((v) => !v)}>Help</button>}
          {review && (mode === 'full'
            ? <button type="button" className="btn-onblue solid" onClick={leaveFull}>Compact view</button>
            : <button type="button" className="btn-onblue solid" onClick={enterFull}><span aria-hidden="true">&#x26F6;</span> Full screen</button>)}
          {screen === 'intake' && !image && !appText && !tour && <button type="button" className="btn-onblue" onClick={() => setTour({ step: 0 })}>Tour</button>}
          <button type="button" className="btn-onblue next" onClick={reset}>Next label</button>
        </Header>
        {screen === 'intake' && notice && <div className="notice" role="status">{notice}</div>}
        {screen === 'intake' && <Intake intake={intake} />}
        {review && <Review image={image} read={read} application={application} result={review.result} fields={review.fields} mode={mode} textScale={textSize.scale} onNext={reset} helpOpen={helpOpen} onCloseHelp={() => setHelpOpen(false)} tourFocus={tourFocus} checking={checking} />}
      </div>
      <Footer wide={mode === 'full' && Boolean(review)} />
    </div>
    {tour && <Tour steps={TOUR_STEPS} step={tour.step} onNext={nextStep} onBack={backStep} onClose={closeTour} />}
    </>
  )
}

function TierChip({ result, checking }) {
  const tier = checking ? CHECKING : TIERS[result.tier]
  return (
    <div className={`chip ${checking ? 'checking' : result.tier}`} role="status">
      <span aria-hidden="true">{tier.symbol}</span>{tier.name}<span className="sub">{checking ? 'One moment.' : tierSummary(result)}</span>
    </div>
  )
}
