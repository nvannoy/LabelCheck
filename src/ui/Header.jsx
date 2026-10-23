export default function Header({ textSize, middle, children }) {
  return (
    <header className="header">
      <div className="title">
        Label check<span className="version">v{__APP_VERSION__}</span>
      </div>
      {middle}
      <div className="spacer" />
      <div className="textsize" role="group" aria-label="Text size">
        <button type="button" aria-label="Smaller text" onClick={textSize.smaller} disabled={!textSize.canShrink}>A&#8722;</button>
        <button type="button" aria-label="Larger text" onClick={textSize.larger} disabled={!textSize.canGrow}>A+</button>
      </div>
      {children}
    </header>
  )
}

export const Footer = ({ wide }) => (
  <footer className="footer" style={wide ? { maxWidth: '80rem' } : undefined}>Prototype built for a take-home assessment. Not affiliated with or endorsed by TTB.</footer>
)
