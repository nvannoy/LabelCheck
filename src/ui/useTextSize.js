import { useEffect, useState } from 'react'

// A- and A+ change the root font size, so everything sized in rem grows with it.
// The size is the only thing the app writes to localStorage.
export const STEPS = [0.875, 1, 1.125, 1.25, 1.5]
const KEY = 'labelcheck-text-size'

function load() {
  try {
    const saved = Number(localStorage.getItem(KEY))
    return STEPS.includes(saved) ? saved : 1
  } catch {
    return 1
  }
}

export function useTextSize() {
  const [scale, setScale] = useState(load)
  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * scale}px`
    try {
      localStorage.setItem(KEY, String(scale))
    } catch {
      // Private mode or blocked storage: the size just is not remembered.
    }
  }, [scale])
  const at = STEPS.indexOf(scale)
  return {
    scale,
    // Functional updates, so two quick clicks move two steps.
    smaller: () => setScale((s) => STEPS[Math.max(0, STEPS.indexOf(s) - 1)]),
    larger: () => setScale((s) => STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(s) + 1)]),
    canShrink: at > 0,
    canGrow: at < STEPS.length - 1,
  }
}
