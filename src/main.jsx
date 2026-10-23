import { createRoot } from 'react-dom/client'
import './ui/theme.css'
import App from './ui/App.jsx'
import OcrProbe from './OcrProbe.jsx'

// The OCR probe stays reachable at /?probe for debugging.
const probe = new URLSearchParams(window.location.search).has('probe')
createRoot(document.getElementById('root')).render(probe ? <OcrProbe /> : <App />)
