import { describe, it, expect } from 'vitest'
import { classifyPaste, classifyDrop, isEditable } from '../src/ui/paste.js'

const data = ({ text = '', files = [] } = {}) => ({ files, getData: (t) => (t === 'text/plain' ? text : '') })
const png = { type: 'image/png', name: 'label.png' }
const APP = 'Brand Name: Harlan Ridge\nClass/Type: Bourbon\nAlcohol Content: 45%\nNet Contents: 750 mL'

describe('classifyPaste', () => {
  it('takes an image with no text as the label image', () => {
    expect(classifyPaste(data({ files: [png] }))).toEqual({ kind: 'image', file: png })
  })
  it('takes application text as text', () => {
    expect(classifyPaste(data({ text: APP }))).toEqual({ kind: 'text', text: APP })
  })
  it('prefers application text when a picture of the selection comes along too', () => {
    expect(classifyPaste(data({ text: APP, files: [png] })).kind).toBe('text')
  })
  it('prefers the image when the text is not application text', () => {
    expect(classifyPaste(data({ text: 'label.png', files: [png] })).kind).toBe('image')
  })
  it('still takes unrecognized text as application text', () => {
    expect(classifyPaste(data({ text: 'Old Tom Distillery 45% 750 mL' })).kind).toBe('text')
  })
  it('ignores an empty or non-image paste', () => {
    expect(classifyPaste(data())).toBeNull()
    expect(classifyPaste(data({ files: [{ type: 'application/pdf', name: 'a.pdf' }] }))).toBeNull()
  })
})

describe('classifyDrop', () => {
  it('reads a dropped text file as application text', async () => {
    const file = { type: 'text/plain', name: 'app.txt', text: async () => `${APP}\n` }
    expect(await classifyDrop(data({ files: [file] }))).toEqual({ kind: 'text', text: APP })
  })
  it('treats a dropped image as the label image', async () => {
    expect((await classifyDrop(data({ files: [png] }))).kind).toBe('image')
  })
})

describe('isEditable', () => {
  it('lets a paste into a typing box behave normally', () => {
    const el = (match) => ({ closest: () => (match ? {} : null) })
    expect(isEditable(el(true))).toBe(true)
    expect(isEditable(el(false))).toBe(false)
  })
})
