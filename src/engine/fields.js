// One entry per field. The UI and the checker both read this list, so adding or
// removing a field means editing this file, not the screens. Rule sentences are
// shown to the agent. Section numbers refer to docs/rules-reference.md.
import * as c from './comparators.js'
import { checkWarning } from './warning.js'

export const FIELDS = [
  {
    id: 'brand', label: 'Brand name', required: 'always', compare: c.brand,
    rule: 'The brand name must be on the label and match the application. Capital letters, punctuation and apostrophes do not matter. (27 CFR 5.64)',
    byEye: ['The brand name is not misleading about age, origin or identity (27 CFR 5.64(b)).'],
  },
  {
    id: 'classType', label: 'Class and type', required: 'always', compare: c.classType,
    rule: 'The class and type must be on the label and match the application text. (27 CFR 5.63(a)(2))',
    byEye: [],
  },
  {
    id: 'abv', label: 'Alcohol content', required: 'always', compare: c.abv,
    rule: 'Alcohol content must be a percentage by volume and the number must match the application exactly. Proof alone is not enough. (27 CFR 5.65)',
    byEye: [],
  },
  {
    id: 'netContents', label: 'Net contents', required: 'always', compare: c.netContents,
    rule: 'Net contents must be on the label and equal the application amount exactly, after unit conversion. (27 CFR 5.70)',
    byEye: [],
  },
  {
    id: 'bottler', label: 'Bottler name and address', required: 'always', compare: c.bottler, bestEffort: true,
    rule: 'The bottler or distiller name and address (city and State) must be on the label and match the application. This match is loose and leans toward Needs Review. (27 CFR 5.66 to 5.68)',
    byEye: [],
  },
  {
    id: 'country', label: 'Country of origin', required: 'imports', compare: c.country, bestEffort: true,
    rule: 'Imported products must name the country of origin, matching the application. Not needed for domestic products. (27 CFR 5.69)',
    byEye: [],
  },
  {
    id: 'warning', label: 'Government warning', required: 'always', compare: (index) => checkWarning(index.words),
    rule: 'The government warning must match the statutory wording word for word, with "GOVERNMENT WARNING:" in capital letters. Bold type and size are checked by the agent. (27 CFR 16.21 and 16.22)',
    byEye: [],
  },
]

// Checks that apply to the whole label and can only be done by looking at it.
export const LABEL_BY_EYE = [
  'Text is readily legible, contrasts with its background, and is separate from other information (27 CFR 5.52).',
  'Type size meets the minimum for the container (27 CFR 5.53).',
  'Brand name, class or type and alcohol content are in the same field of vision (27 CFR 5.63(a)).',
]
