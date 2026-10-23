import { describe, it, expect } from 'vitest'
import { draftNotes } from '../src/ui/notes.js'
import { checkLabel } from '../src/engine/check.js'
import { rowStatus } from '../src/ui/status.js'
import { wordsFrom, APP } from './engine-helpers.js'
import { WARNING_TEXT } from '../src/engine/warning.js'

const LABEL = `HARLAN RIDGE ${APP.classType} 45% Alc./Vol. 750 mL Bottled by ${APP.bottler} ${WARNING_TEXT}`
function notes(decision, text = LABEL) {
  const result = checkLabel({ words: wordsFrom(text), application: APP })
  const fields = result.fields.map((f) => ({ ...f, display: rowStatus(f) }))
  return draftNotes({ decision, fileName: 'label.png', fields, labelByEye: result.labelByEye, imageProblems: result.imageProblems })
}

describe('draftNotes', () => {
  it('names the decision the agent chose', () => {
    expect(notes('verified')).toContain('Decision: Label verified')
    expect(notes('issues')).toContain('Decision: Issues found')
  })
  it('lists a mismatch with the reason under issues', () => {
    expect(notes('issues', LABEL.replace('45%', '40%'))).toContain('Alcohol content: Mismatch. The label states 40%')
  })
  it('always lists the warning checks that only a person can do', () => {
    for (const d of ['verified', 'issues']) {
      expect(notes(d)).toMatch(/Bold type/)
      expect(notes(d)).toMatch(/Type size/)
    }
  })
  it('says when a verified label still had flagged fields', () => {
    expect(notes('verified', LABEL.replace('750 mL', ''))).toContain('The app flagged 1 field')
  })
  it('has no em-dashes', () => {
    expect(notes('issues', LABEL.replace('45%', '40%'))).not.toContain('—')
  })
})
