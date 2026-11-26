/**
 * The defeat cutscene (decision #53): when the last right answer wins a battle the panel steps aside, the camera
 * swoops in low, the hero lands a finishing blow, the monster bursts into sparkles and a VICTORY banner shows; then the
 * rewards. Times in milliseconds from the win. Pure, so the timeline and camera are unit-tested.
 */
export const FINISHER = { attackAt: 250, impactAt: 650, bannerAt: 800, cheerAt: 1500, duration: 2600 }

const CLOSE = { distance: 6.5, tilt: 24 }
const SWOOP_MS = 500
const SHAKE_MS = 260
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (k: number) => 1 - (1 - k) ** 3

type Point = { x: number; y: number }
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/**
 * Where the camera sits t ms into the cutscene: from the player's own view (`yaw`, radians) to a low close-up from the
 * side of the hero→monster line (a little behind the hero), on the side nearer the player's view, then a slow orbit
 * toward fully side-on.
 */
export function finisherCamera(t: number, view: { distance: number; tilt: number }, yaw: number, hero: Point, foe: Point) {
  const blend = easeOut(clamp01(t / SWOOP_MS))
  const shakeT = (t - FINISHER.impactAt) / SHAKE_MS
  const line = facingToward(hero, foe)
  const side = Math.sign(wrap(yaw - line)) || 1
  const orbit = 0.35 * clamp01(t / FINISHER.duration)
  const goal = line + side * (Math.PI / 2 + 0.5 - orbit)
  return {
    blend,
    distance: view.distance + (CLOSE.distance - view.distance) * blend,
    tilt: view.tilt + (CLOSE.tilt - view.tilt) * blend,
    yaw: yaw + wrap(goal - yaw) * blend,
    shake: shakeT >= 0 && shakeT < 1 ? 1 - shakeT : 0,
  }
}

/** The heading that faces `to` from `from` (grid x → world x, grid y → world z, as the sim uses). */
export const facingToward = (from: Point, to: Point) => Math.atan2(to.x - from.x, to.y - from.y)

/** Set by the world when the blow lands, read by the sparkle burst (one at a time). */
export const defeatBurst = { at: -1, x: 0, z: 0 }
