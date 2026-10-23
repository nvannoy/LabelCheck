// "What the app read": one line per field, with how sure the read was.
// Low confidence goes to a person, so a low number is never hidden.
function readAs(f) {
  if (f.status === 'na') return 'Not on label (not required)'
  if (f.id === 'warning') {
    if (f.status === 'match') return 'Text found, wording matches'
    return f.found ? 'Text found, wording differs or is unclear' : 'Not found'
  }
  return f.found ? `${f.found}${f.apart ? ' *' : ''}` : 'Not found'
}

export default function ReadTable({ fields }) {
  return (
    <section className="readtable" aria-labelledby="read-h">
      <h2 id="read-h">What the app read from the label<span>(low confidence goes to a person)</span></h2>
      <table>
        <thead>
          <tr><th scope="col">#</th><th scope="col">Field</th><th scope="col">Read as</th><th scope="col" className="num">Confidence</th></tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={f.id} className={f.status === 'mismatch' ? 'bad' : ''}>
              <td>{i + 1}</td>
              <td>{f.label}</td>
              <td title={readAs(f)}>{readAs(f)}</td>
              <td className="num">{f.status === 'na' || !f.found ? '–' : `${f.confidence}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
