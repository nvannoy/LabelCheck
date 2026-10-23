// Decides what a paste or a drop holds: a label image or application text.
// The agent should not have to click a field first.
//
// Text that reads like application text (at least one "Label: value" line the
// parser knows) wins over an image, because copying from a document often puts
// a picture of the selection on the clipboard as well. Any other text is still
// taken as application text so the agent can fix it by hand. An image with no
// text is a label image.
import { parseApplication } from '../engine/parse.js'

const isImage = (f) => f?.type?.startsWith('image/')

export function classifyPaste(data) {
  const text = (data?.getData?.('text/plain') ?? '').trim()
  const image = [...(data?.files ?? [])].find(isImage)
  if (text && parseApplication(text).found > 0) return { kind: 'text', text }
  if (image) return { kind: 'image', file: image }
  if (text) return { kind: 'text', text }
  return null
}

// Drops can also carry a text file (for example a saved application summary).
export async function classifyDrop(data) {
  const files = [...(data?.files ?? [])]
  const textFile = files.find((f) => f.type.startsWith('text/') || /\.txt$/i.test(f.name))
  if (textFile) {
    const text = (await textFile.text()).trim()
    if (text) return { kind: 'text', text }
  }
  return classifyPaste(data)
}

// A paste into a box the agent is typing in should behave normally.
export const isEditable = (el) => Boolean(el?.closest?.('input, textarea, select, [contenteditable="true"]'))
