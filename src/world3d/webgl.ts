/** True when the browser can draw WebGL (checked once; old phones and blocked GPUs return false). */
let cached: boolean | undefined
export function hasWebGL(): boolean {
  if (cached !== undefined) return cached
  try {
    const c = document.createElement('canvas')
    cached = Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    cached = false
  }
  return cached
}
