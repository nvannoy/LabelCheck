// Throwaway Phase 0 page: proves OCR runs in a worker with self-hosted files.
import { useEffect, useRef, useState } from 'react'
import { startWorker, readImage } from './ocr/ocr.js'

export default function OcrProbe() {
  const workerRef = useRef(null)
  const [ready, setReady] = useState(null) // ms to load the engine
  const [imageUrl, setImageUrl] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [secondPass, setSecondPass] = useState(false)

  useEffect(() => {
    const t0 = performance.now()
    const pending = startWorker()
    pending
      .then((w) => {
        workerRef.current = w
        setReady(performance.now() - t0)
      })
      .catch((e) => setError(String(e)))
    return () => { pending.then((w) => w.terminate()).catch(() => {}) }
  }, [])

  async function run(blob) {
    setResult(null)
    setError(null)
    const url = URL.createObjectURL(blob)
    setImageUrl(url)
    try {
      setResult(await readImage(workerRef.current, blob, { secondPass }))
    } catch (e) {
      setError(String(e))
    }
  }

  function onPaste(e) {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'))
    if (file) run(file)
  }

  return (
    <main onPaste={onPaste}>
      <p>Version {__APP_VERSION__}</p>
      <h1>OCR probe (throwaway)</h1>
      <p>{ready === null ? 'Loading OCR engine…' : `Engine ready in ${Math.round(ready)} ms.`}</p>
      <label>
        Choose a label image, or paste one:{' '}
        <input type="file" accept="image/*" disabled={ready === null}
          onChange={(e) => e.target.files[0] && run(e.target.files[0])} />
      </label>
      <p>
        <label>
          <input type="checkbox" checked={secondPass} onChange={(e) => setSecondPass(e.target.checked)} />{' '}
          Second pass with inverted colors when alcohol content or net contents is not found (slower)
        </label>
      </p>
      {error && <p role="alert">Error: {error}</p>}
      {imageUrl && <img src={imageUrl} alt="Label being read" />}
      {result && (
        <>
          <p id="result-summary">
            Read {result.words.length} words in {Math.round(result.ms)} ms.
          </p>
          <p>
            Panels: {result.panels.length}. Second pass:{' '}
            {result.secondPass.ran
              ? `ran for ${result.secondPass.missing.join(', ')} (${result.secondPass.added} words added, ${Math.round(result.secondPass.ms)} ms)`
              : secondPass ? 'not needed' : 'off'}.
          </p>
          <table>
            <thead>
              <tr><th>Word</th><th>Confidence</th><th>x0</th><th>y0</th><th>x1</th><th>y1</th></tr>
            </thead>
            <tbody>
              {result.words.map((w, i) => (
                <tr key={i}>
                  <td>{w.text}</td><td>{Math.round(w.confidence)}</td>
                  <td>{w.bbox.x0}</td><td>{w.bbox.y0}</td><td>{w.bbox.x1}</td><td>{w.bbox.y1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  )
}
