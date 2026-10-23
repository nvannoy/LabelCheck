import { useTextSize } from './useTextSize.js'
import Header, { Footer } from './Header.jsx'

export default function App() {
  const textSize = useTextSize()
  return (
    <div className="app">
      <div className="frame compact">
        <Header textSize={textSize} />
        <main className="step plain">
          <p>Intake screen goes here.</p>
        </main>
      </div>
      <Footer />
    </div>
  )
}
