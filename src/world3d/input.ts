import type { Point } from '../game/iso'

const MOVE: Record<string, Point> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}
const INTERACT = new Set(['KeyE', 'Space', 'Enter'])
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

/**
 * Keyboard for the world. Keys are read, never captured, so buttons and answer fields keep working;
 * typing in a field never moves the hero.
 */
export function listenKeys(onInteract: () => void) {
  const down = new Set<string>()
  const kd = (e: KeyboardEvent) => {
    if (typing(e.target)) return
    if (MOVE[e.code]) down.add(e.code)
    if (INTERACT.has(e.code) && !e.repeat) onInteract()
  }
  const ku = (e: KeyboardEvent) => down.delete(e.code)
  const blur = () => down.clear()
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
  window.addEventListener('blur', blur)
  return {
    /** Screen-space direction from the held keys (up = −y). */
    read(): Point {
      let x = 0
      let y = 0
      for (const c of down) {
        x += MOVE[c].x
        y += MOVE[c].y
      }
      return { x: Math.sign(x), y: Math.sign(y) }
    },
    stop() {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('blur', blur)
    },
  }
}
