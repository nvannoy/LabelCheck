// Country names a label may print after "Product of". Used only to tell a real,
// different country (Mismatch) from a garbled read (Check). Names are lower case.
const NAMES = `afghanistan albania algeria andorra angola argentina armenia australia austria azerbaijan
bahamas bahrain bangladesh barbados belarus belgium belize benin bhutan bolivia bosnia botswana brazil
brunei bulgaria burkina burundi cambodia cameroon canada chad chile china colombia congo costa croatia
cuba cyprus czechia denmark dominica ecuador egypt england estonia ethiopia fiji finland france gabon
gambia georgia germany ghana greece grenada guatemala guyana haiti holland honduras hungary iceland
india indonesia iran iraq ireland israel italy jamaica japan jordan kazakhstan kenya korea kuwait laos
latvia lebanon lesotho liberia libya liechtenstein lithuania luxembourg madagascar malawi malaysia
maldives mali malta mauritius mexico moldova monaco mongolia montenegro morocco mozambique myanmar
namibia nepal netherlands nicaragua niger nigeria norway oman pakistan panama paraguay peru
philippines poland portugal qatar romania russia rwanda scotland senegal serbia singapore slovakia
slovenia somalia spain sudan suriname sweden switzerland syria taiwan tanzania thailand togo tonga
trinidad tunisia turkey uganda ukraine uruguay uzbekistan venezuela vietnam wales yemen zambia zimbabwe`
  .split(/\s+/)

const TWO_WORD = ['united states', 'united kingdom', 'new zealand', 'south africa', 'south korea', 'sri lanka',
  'saudi arabia', 'dominican republic', 'el salvador', 'puerto rico', 'hong kong', 'northern ireland',
  'czech republic', 'united arab', 'costa rica', 'north macedonia', 'papua new']

const KNOWN = new Set([...NAMES, ...TWO_WORD])

// The country at the start of the words read, or null when they do not begin with one
// ("mexico government" gives "mexico"; the garbled "n canad" gives null).
export function countryName(words) {
  const two = words.slice(0, 2).join(' ')
  if (KNOWN.has(two)) return two
  return KNOWN.has(words[0]) ? words[0] : null
}
