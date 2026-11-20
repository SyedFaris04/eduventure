type P = { x: number; y: number }

/**
 * Two fingers from (a0, b0) to (a1, b1): `scale` multiplies the camera distance (fingers apart → closer), `yawDeg` is
 * the twist in degrees, `panY` how far the fingers' midpoint moved down the screen (up is negative).
 */
export function twoFinger(a0: P, b0: P, a1: P, b1: P) {
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y)
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y)
  const turn = Math.atan2(b1.y - a1.y, b1.x - a1.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x)
  const yawDeg = (((((turn * 180) / Math.PI + 180) % 360) + 360) % 360) - 180
  return { scale: d1 > 0 ? d0 / d1 : 1, yawDeg, panY: (a1.y + b1.y) / 2 - (a0.y + b0.y) / 2 }
}
