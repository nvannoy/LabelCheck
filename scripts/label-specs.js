// Source of truth for the generated test labels. Pure data, no drawing.
// Each spec has the application text (what the agent would have), what the
// label actually shows, how it is drawn, and the result we expect.
// Fictional brands only.

export const WARNING =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.'

const FIELDS = ['brand', 'classType', 'abv', 'netContents', 'bottler', 'country', 'warning']

const bases = {
  bourbon: {
    application: { brand: 'Harlan Ridge', classType: 'Kentucky Straight Bourbon Whiskey', abv: '45% Alc./Vol.', netContents: '750 mL', bottler: "Harlan Ridge Distilling Co., Bardstown, KY", imported: false, country: null },
    style: { layout: 'classic', font: 'Georgia', bg: '#f4ecd8', fg: '#2b1f0e' },
  },
  vodka: {
    application: { brand: 'Silver Pike', classType: 'Vodka', abv: '40% Alc./Vol.', netContents: '1 L', bottler: 'Silver Pike Spirits, Minneapolis, MN', imported: false, country: null },
    style: { layout: 'modern', font: 'Arial', bg: '#ffffff', fg: '#10233f' },
  },
  gin: {
    application: { brand: 'Juniper Hollow', classType: 'London Dry Gin', abv: '47% Alc./Vol.', netContents: '750 mL', bottler: 'Juniper Hollow Distillers, Portland, OR', imported: false, country: null },
    style: { layout: 'dark', font: 'Trebuchet MS', bg: '#14281e', fg: '#f2efe4' },
  },
  rum: {
    application: { brand: 'Copper Marsh', classType: 'Aged Rum', abv: '40% Alc./Vol.', netContents: '1.75 L', bottler: 'Copper Marsh Rum Works, Savannah, GA', imported: false, country: null },
    style: { layout: 'classic', font: 'Times New Roman', bg: '#efe3c8', fg: '#3b1d0a' },
  },
  tequila: {
    application: { brand: 'Valle Sombra', classType: 'Tequila Reposado', abv: '40% Alc./Vol.', netContents: '750 mL', bottler: 'Sombra Imports, San Diego, CA', imported: true, country: 'Mexico' },
    style: { layout: 'modern', font: 'Verdana', bg: '#f7efe0', fg: '#5a1a12' },
  },
  brandy: {
    application: { brand: 'Alder Fork', classType: 'Apple Brandy', abv: '40% Alc./Vol.', netContents: '750 mL', bottler: 'Alder Fork Cellars, Hudson, NY', imported: false, country: null },
    style: { layout: 'dark', font: 'Georgia', bg: '#2a1a2e', fg: '#f3e9d2' },
  },
}

// What the label prints when nothing is wrong.
function cleanLabel(app, over = {}) {
  return {
    brand: app.brand,
    classType: app.classType,
    abv: app.abv,
    netContents: app.netContents,
    bottler: `${app.imported ? 'Imported by' : 'Bottled by'} ${app.bottler}`,
    country: app.imported ? `Product of ${app.country}` : null,
    warning: WARNING,
    ...over,
  }
}

const allMatch = () => Object.fromEntries(FIELDS.map((f) => [f, 'match']))

// expect: ideal status per field. country is 'na' for domestic products.
function make(id, baseKey, defect, { app = {}, label = {}, style = {}, expect = {} } = {}) {
  const b = bases[baseKey]
  const application = { ...b.application, ...app }
  const fields = { ...allMatch(), ...(application.imported ? {} : { country: 'na' }), ...expect }
  const overall = Object.values(fields).every((s) => s === 'match' || s === 'na') ? 'ready' : 'not-ready'
  return {
    id,
    kind: 'generated',
    defect,
    application,
    label: cleanLabel(application, label),
    style: { ...b.style, ...style },
    expected: { fields, overall },
  }
}

export const generated = [
  // Clean labels. These should be Ready to Approve (the agent still decides).
  make('c01-clean-bourbon', 'bourbon', null),
  make('c02-clean-vodka', 'vodka', null),
  make('c03-clean-gin-dark', 'gin', null),
  make('c04-clean-rum-1p75l', 'rum', null),
  make('c05-clean-tequila-import', 'tequila', null),
  make('c06-clean-brandy-alcohol-format', 'brandy', null, { label: { abv: 'Alcohol 40% by volume' } }),
  make('c07-brand-case-differs', 'bourbon', 'Brand printed in capitals, application has mixed case (should match)', { label: { brand: 'HARLAN RIDGE' } }),
  make('c08-brand-apostrophe-differs', 'vodka', 'Brand has a curly apostrophe, application a straight one (should match)', {
    app: { brand: "Pike's Bend" },
    label: { brand: 'Pike’s Bend' },
  }),

  // One defect each. None of these may come out Ready to Approve.
  make('d01-abv-wrong', 'bourbon', 'Label says 40%, application says 45%', { label: { abv: '40% Alc./Vol.' }, expect: { abv: 'mismatch' } }),
  make('d02-abv-missing', 'vodka', 'No alcohol content on the label', { label: { abv: null }, expect: { abv: 'check' } }),
  make('d03-abv-proof-only', 'gin', 'Only proof is printed, no percentage', { label: { abv: '94 Proof' }, expect: { abv: 'check' } }),
  make('d04-net-wrong', 'rum', 'Label says 1 L, application says 1.75 L', { label: { netContents: '1 L' }, expect: { netContents: 'mismatch' } }),
  make('d05-net-missing', 'brandy', 'No net contents on the label', { label: { netContents: null }, expect: { netContents: 'check' } }),
  make('d06-brand-different', 'gin', 'Label brand is a different name', { label: { brand: 'Juniper Hallow Reserve' }, expect: { brand: 'mismatch' } }),
  make('d07-class-wrong', 'bourbon', 'Label says Rye Whiskey, application says Bourbon', { label: { classType: 'Kentucky Straight Rye Whiskey' }, expect: { classType: 'mismatch' } }),
  make('d08-bottler-name-different', 'rum', 'Different company name in the bottler line', { label: { bottler: 'Bottled by Marsh Island Rum Works, Savannah, GA' }, expect: { bottler: 'mismatch' } }),
  make('d09-bottler-address-different', 'vodka', 'Right company, different city and state', { label: { bottler: 'Bottled by Silver Pike Spirits, Duluth, WI' }, expect: { bottler: 'mismatch' } }),
  make('d10-bottler-missing', 'brandy', 'No bottler name and address', { label: { bottler: null }, expect: { bottler: 'check' } }),
  make('d11-import-country-missing', 'tequila', 'Import with no country of origin on the label', { label: { country: null }, expect: { country: 'check' } }),
  make('d12-import-country-wrong', 'tequila', 'Label says Spain, application says Mexico', { label: { country: 'Product of Spain' }, expect: { country: 'mismatch' } }),
  make('d13-warning-word-changed', 'bourbon', 'Warning says "drive a truck" instead of "drive a car"', {
    label: { warning: WARNING.replace('drive a car', 'drive a truck') },
    expect: { warning: 'mismatch' },
  }),
  make('d14-warning-sentence-dropped', 'vodka', 'Warning clause (2) is missing', {
    label: { warning: WARNING.split(' (2)')[0] },
    expect: { warning: 'mismatch' },
  }),
  make('d15-warning-title-mixed-case', 'gin', 'Title printed as "Government Warning:" instead of all capitals', {
    label: { warning: WARNING.replace('GOVERNMENT WARNING:', 'Government Warning:') },
    expect: { warning: 'mismatch' },
  }),
  make('d16-warning-missing', 'rum', 'No government warning on the label', { label: { warning: null }, expect: { warning: 'check' } }),
  make('d17-warning-clauses-swapped', 'brandy', 'Warning clauses (1) and (2) appear in the wrong order', {
    label: {
      warning:
        'GOVERNMENT WARNING: (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems. (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects.',
    },
    expect: { warning: 'mismatch' },
  }),

  // Image quality. Text is right, but the image is hard to read, so these must not be Ready.
  make('q01-low-resolution', 'bourbon', 'Image shrunk to about 450 px wide', { style: { outputWidth: 450 }, expect: { warning: 'check' } }),
  make('q02-low-contrast', 'vodka', 'Pale gray text on a white background', { style: { fg: '#c9c9c9' }, expect: { brand: 'check', classType: 'check', abv: 'check', netContents: 'check', bottler: 'check', warning: 'check' } }),
  make('q03-tiny-warning', 'gin', 'Warning printed at a very small size', { style: { warningSize: 11 }, expect: { warning: 'check' } }),
]

// Real TTB sample images. The application text is what the label itself shows,
// since TTB publishes no matching application. Kept as a robustness check.
export const samples = [
  {
    id: 's01-ttb-abc-rye',
    kind: 'sample',
    file: 'tests/samples/ttb-brand-label-new1.jpg',
    source: 'https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/ds-brand-label',
    note: 'Brand label and back label in one image (the app supports one label per image, so this is a stress case).',
    application: { brand: 'ABC', classType: 'Straight Rye Whisky', abv: '45% Alc./Vol.', netContents: '750 mL', bottler: 'ABC Distillery, Frederick, MD', imported: false, country: null },
    expected: { fields: { ...allMatch(), country: 'na' }, overall: 'ready' },
  },
  {
    id: 's02-ttb-12345-imports-rum',
    kind: 'sample',
    file: 'tests/samples/ttb-brand-label-new2.jpg',
    source: 'https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/ds-brand-label',
    note: 'Imported rum liqueur, brand label and back label in one image.',
    application: { brand: '12345 Imports', classType: 'Rum with Coconut Liqueur', abv: '18% Alc./Vol.', netContents: '200 mL', bottler: '12345 Imports, Miami, FL', imported: true, country: 'Canada' },
    expected: { fields: allMatch(), overall: 'ready' },
  },
]

export const FIELD_IDS = FIELDS
