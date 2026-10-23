// The label cases from the stakeholder QA plan (tests/qa/QA-PLAN.md), as checks on the
// engine's result for a real OCR read. npm run evaluate runs them.
// kind 'clean': Ready to approve is the goal; Needs review is accepted and recorded.
// kind 'bad': anything but Ready to approve is a pass; Ready to approve is a release blocker.
// kind 'sample': the ideal is Ready to approve; Needs review is accepted.
const field = (out, id) => out.fields.find((f) => f.id === id)
const ready = (out) => out.overall === 'ready'

export const QA_LABEL_CASES = [
  { id: 'c01-clean-bourbon', qa: 'S9, J1', kind: 'clean', need: 'Ready to approve, every field Match', ok: (o) => ready(o) },
  { id: 'c05-clean-tequila-import', qa: 'B2', kind: 'clean', need: 'Ready to approve, country Match', ok: (o) => ready(o) && field(o, 'country').status === 'match' },
  { id: 'c07-brand-case-differs', qa: 'D1', kind: 'clean', need: 'Ready to approve, brand Match', ok: (o) => ready(o) && field(o, 'brand').status === 'match' },
  { id: 'c08-brand-apostrophe-differs', qa: 'D1', kind: 'clean', need: 'Ready to approve, brand Match', ok: (o) => ready(o) && field(o, 'brand').status === 'match' },
  { id: 'd01-abv-wrong', qa: 'B3, S9', kind: 'bad', need: 'Likely reject, alcohol content Mismatch', ok: (o) => o.tier === 'reject' && field(o, 'abv').status === 'mismatch' },
  { id: 'd03-abv-proof-only', qa: 'B3', kind: 'bad', need: 'alcohol content Check', ok: (o) => field(o, 'abv').status === 'check' },
  { id: 'd04-net-wrong', qa: 'B3', kind: 'bad', need: 'Likely reject, net contents Mismatch', ok: (o) => o.tier === 'reject' && field(o, 'netContents').status === 'mismatch' },
  { id: 'd05-net-missing', qa: 'B3', kind: 'bad', need: 'net contents Check', ok: (o) => field(o, 'netContents').status === 'check' },
  { id: 'd06-brand-different', qa: 'D2', kind: 'bad', need: 'brand is not Match', ok: (o) => field(o, 'brand').status !== 'match' },
  { id: 'd11-import-country-missing', qa: 'B2', kind: 'bad', need: 'country Check', ok: (o) => field(o, 'country').status === 'check' },
  { id: 'd12-import-country-wrong', qa: 'B2', kind: 'bad', need: 'country Mismatch', ok: (o) => field(o, 'country').status === 'mismatch' },
  { id: 'd13-warning-word-changed', qa: 'J2', kind: 'bad', need: 'warning Mismatch, reason names the word', ok: (o) => field(o, 'warning').status === 'mismatch' && /truck/.test(field(o, 'warning').reason) },
  { id: 'd14-warning-sentence-dropped', qa: 'J2', kind: 'bad', need: 'warning Mismatch, reason names the clause', ok: (o) => field(o, 'warning').status === 'mismatch' && /Clause \(2\)/.test(field(o, 'warning').reason) },
  { id: 'd15-warning-title-mixed-case', qa: 'J3', kind: 'bad', need: 'warning Mismatch, reason says capital letters', ok: (o) => field(o, 'warning').status === 'mismatch' && /capital letters/.test(field(o, 'warning').reason) },
  { id: 'd16-warning-missing', qa: 'J4', kind: 'bad', need: 'warning Check ("not found"), never Match', ok: (o) => field(o, 'warning').status === 'check' && /not found/.test(field(o, 'warning').reason) },
  { id: 'd17-warning-clauses-swapped', qa: 'J2', kind: 'bad', need: 'warning Mismatch, reason names what differs', ok: (o) => field(o, 'warning').status === 'mismatch' && field(o, 'warning').reason.length > 20 },
  { id: 'd18-warning-title-not-bold', qa: 'J5', kind: 'bad', need: 'not Ready to approve', ok: (o) => !ready(o) },
  { id: 'd19-warning-all-bold', qa: 'J5', kind: 'bad', need: 'not Ready to approve', ok: (o) => !ready(o) },
  { id: 'q01-low-resolution', qa: 'J7', kind: 'bad', need: 'low-resolution flag, nothing Ready', ok: (o) => o.imageProblems.some((p) => /px wide/.test(p)) && !ready(o) },
  { id: 'q02-low-contrast', qa: 'J7', kind: 'bad', need: 'low-contrast flag, nothing Ready', ok: (o) => o.imageProblems.some((p) => /contrast/.test(p)) && !ready(o) },
  { id: 'q03-tiny-warning', qa: 'J6', kind: 'bad', need: 'warning Check, never Match', ok: (o) => field(o, 'warning').status === 'check' },
  { id: 's01-ttb-abc-rye', qa: 'B9', kind: 'sample', need: 'Ready to approve ideal; Needs review accepted', ok: (o) => ready(o) },
  { id: 's02-ttb-12345-imports-rum', qa: 'B9', kind: 'sample', need: 'Ready to approve ideal; Needs review accepted', ok: (o) => ready(o) },
  { id: 'r01-ttb-malt-and-hop', qa: 'B9', kind: 'sample', need: 'Ready to approve ideal; Needs review accepted', ok: (o) => ready(o) },
]

// 'pass', 'recorded' (an accepted extra review) or 'fail'. A bad label that is Ready is always a fail.
export function judge(c, out) {
  if (c.kind === 'bad') return ready(out) ? 'fail' : c.ok(out) ? 'pass' : 'fail'
  return c.ok(out) ? 'pass' : out.fields.some((f) => f.status === 'mismatch' && c.kind === 'clean') ? 'fail' : 'recorded'
}
