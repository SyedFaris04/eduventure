/**
 * While building, only a clean tap places, picks up or removes: one finger (or a click) that lifts within 10 px of where
 * it went down. A drag, or any touch that became a two-finger pinch or twist (the camera), never builds.
 */
export function isBuildTap(down: { x: number; y: number; multi: boolean } | null, up: { x: number; y: number }): boolean {
  return Boolean(down && !down.multi && Math.hypot(up.x - down.x, up.y - down.y) < 10)
}
