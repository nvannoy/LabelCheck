// The made-up sample label for the tour (see scripts/make-tour-sample.js). The tour
// uses what the reader found on it, recorded in sample-read.json, so it needs no OCR
// and shows the same thing every time. The brand is fictional.
import labelUrl from './sample-label.png'
import read from './sample-read.json'

export const SAMPLE_READ = read

// The net contents differ on purpose (the label says 750 mL), so the tour can show a
// mismatch and a Likely reject result.
export const SAMPLE_TEXT = `Brand Name: Cedar Fork
Class/Type: Straight Rye Whiskey
Alcohol Content: 45% Alc./Vol.
Net Contents: 700 mL
Applicant: Cedar Fork Distilling Co., Louisville, KY
Origin: Domestic`

// A File of the sample image, built from the bundled picture without any network request,
// so the review screen can draw it and measure the warning like a pasted label.
export async function sampleFile() {
  const img = new Image()
  img.src = labelUrl
  await img.decode()
  const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight)
  canvas.getContext('2d').drawImage(img, 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new File([blob], 'sample-label.png', { type: 'image/png' })
}
