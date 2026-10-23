import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTextSize } from './useTextSize.js'
import Header, { Footer } from './Header.jsx'
import Intake from './Intake.jsx'
import Review from './Review.jsx'
import { startWorker, readImage } from '../ocr/ocr.js'
import { parseApplication, APPLICATION_FIELDS } from '../engine/parse.js'
import { qualityProblems } from '../engine/check.js'

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

  // The engine starts loading as the page opens, so it is ready when the image arrives.
  useEffect(() => {
    ready.current = startWorker()
    ready.current.then((w) => { worker.current = w; setEngine('ready') }).catch(() => setEngine('error'))
    return () => { ready.current?.then((w) => w.terminate()).catch(() => {}) }
  }, [])

  const reset = useCallback(() => {
    current.current++
    setImage((old) => { if (old) URL.revokeObjectURL(old.url); return null })
    setRead(EMPTY_READ)
    setAppText('')
    setEdits({})
    setImportedChoice(null)
    setScreen('intake')
  }, [])

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
      const result = await readImage(w, file)
      if (id !== current.current) return
      if (result.words.filter((x) => x.text.trim().length > 1).length < 3) {
        setRead({ status: 'error', error: NOTHING_READ })
        return
      }
      setRead({ status: 'done', ms: result.ms, result, problems: qualityProblems(result.quality) })
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
  const imported = importedChoice ?? Boolean(values.country)
  const count = APPLICATION_FIELDS.filter((id) => values[id]).length
  const application = useMemo(() => ({ ...values, imported }), [values, imported])

  const intake = {
    engine, image, read, onFile, appText, setAppText, parsed, values, count, imported,
    setValue: (id, v) => setEdits((e) => ({ ...e, [id]: v.trim() })),
    setImported: setImportedChoice,
    onStart: () => setScreen('review'),
  }

  return (
    <div className="app">
      <div className="frame compact">
        <Header textSize={textSize}>
          <button type="button" className="btn-onblue" onClick={reset}>Next label</button>
        </Header>
        {screen === 'intake' && <Intake intake={intake} />}
        {screen === 'review' && <Review image={image} read={read} application={application} textScale={textSize.scale} />}
      </div>
      <Footer />
    </div>
  )
}
