// Fonts for drawing the test labels and the tour sample. They come from the @fontsource
// packages (open licence, regular and bold of five different families), not from the
// computer, so the labels are drawn the same on macOS, Windows and Linux.
import { GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'

// family name used in the drawing code -> @fontsource package
export const FAMILIES = {
  'Libre Baskerville': 'libre-baskerville',
  Lora: 'lora',
  Arimo: 'arimo',
  'Open Sans': 'open-sans',
  'Fira Sans': 'fira-sans',
}

const file = (pkg, weight) => fileURLToPath(new URL(`../node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff`, import.meta.url))

// Registers "Family" (regular) and "Family Bold" for each family.
export function registerFonts() {
  for (const [family, pkg] of Object.entries(FAMILIES)) {
    GlobalFonts.registerFromPath(file(pkg, 400), family)
    GlobalFonts.registerFromPath(file(pkg, 700), `${family} Bold`)
  }
}
