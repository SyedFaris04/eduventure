import type { Point } from '../game/iso'

/** Further than this, a player jumped (a new island, a reconnect): show them there at once instead of sliding across. */
const JUMP = 6

/** One step of another player's glide toward their last reported spot, at walking speed. */
export function glide(from: Point, to: Point, dt: number, speed = 3.2): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const d = Math.hypot(dx, dy)
  if (d < 0.01 || d > JUMP) return { x: to.x, y: to.y }
  const k = Math.min(1, (speed * dt) / d)
  return { x: from.x + dx * k, y: from.y + dy * k }
}

/** The way a player faces: toward where they are going (the game's own atan2(dx, dy)), or as before when standing. */
export function faceToward(from: Point, to: Point, current: number): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return Math.hypot(dx, dy) < 0.001 ? current : Math.atan2(dx, dy)
}
