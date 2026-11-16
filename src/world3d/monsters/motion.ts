export type MotionState = 'idle' | 'hop' | 'hit' | 'poof'
export type Motion = { y: number; sx: number; sy: number; sz: number; opacity: number }

export const HOP_HEIGHT = 0.3
const squash = (sy: number, y = 0, opacity = 1): Motion => {
  const side = 1 / Math.sqrt(sy) // keep the volume: sx · sy · sz = 1
  return { y, sx: side, sy, sz: side, opacity }
}

/**
 * Code-driven monster motion. `t01` runs 0→1 over one cycle (idle breath, one hop, one hit, the poof);
 * `seed` offsets the idle breath so a group of monsters doesn't move in lockstep.
 */
export function monsterMotion(state: MotionState, t01: number, seed: number): Motion {
  const t = Math.min(1, Math.max(0, t01))
  switch (state) {
    case 'hop': // squashed at take-off and landing, stretched at the top of the arc
      return squash(1 - 0.15 * Math.cos(2 * Math.PI * t), t === 0 ? 0 : 4 * HOP_HEIGHT * t * (1 - t))
    case 'hit':
      return squash(1 - 0.28 * Math.sin(Math.PI * t) * (1 - t))
    case 'poof':
      return squash(1 + 0.1 * Math.sin(Math.PI * t), 0.3 * t, 1 - t)
    default:
      return squash(1 + 0.05 * Math.sin(2 * Math.PI * (t + seed)))
  }
}
