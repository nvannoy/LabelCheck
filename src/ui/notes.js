// Drafts the review notes the agent can edit and copy. Plain text, no em-dashes.
// The draft states what the app found and what is still for the agent. It never
// decides anything: the decision is the button the agent pressed.

const DECISIONS = { verified: 'Label verified', issues: 'Issues found' }

export function draftNotes({ decision, fileName, fields, labelByEye, imageProblems = [], reviewed = {} }) {
  const flagged = fields.filter((f) => f.status === 'mismatch' || f.status === 'check')
  const lines = ['Label review notes', `File: ${fileName}`, `Decision: ${DECISIONS[decision]}`, '']

  if (decision === 'issues') {
    lines.push('Issues:')
    if (flagged.length) for (const f of flagged) lines.push(`- ${f.label}: ${f.status === 'mismatch' ? 'Mismatch' : 'Needs a closer look'}. ${f.reason}`)
    else lines.push('- (none flagged by the app; describe the issue here)')
  } else if (flagged.length) {
    lines.push(`The app flagged ${flagged.length} ${flagged.length === 1 ? 'field' : 'fields'}. Review them before you copy these notes:`)
    for (const f of flagged) lines.push(`- ${f.label}: ${f.reason}`)
  } else {
    lines.push('The app found every field matching the application.')
  }

  lines.push('', 'Field results:')
  fields.forEach((f, i) => {
    const text = f.display ? f.display.text : f.status
    lines.push(`${i + 1}. ${f.label}: ${text}${reviewed[f.id] ? ' (reviewed)' : ''}`)
  })

  if (imageProblems.length) lines.push('', 'Image:', ...imageProblems.map((p) => `- ${p}`))

  lines.push('', 'Confirm by eye (the app cannot read these):')
  const warning = fields.find((f) => f.id === 'warning')
  for (const t of warning?.byEye ?? []) lines.push(`- ${t}`)
  for (const t of labelByEye) lines.push(`- ${t}`)
  return lines.join('\n')
}
