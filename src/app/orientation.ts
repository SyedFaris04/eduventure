/** Phones play sideways (owner's choice). A phone: a touch screen whose short side is under 600 CSS px. */
type Screen = { width: number; height: number; coarse: boolean }
export const isPhone = ({ width, height, coarse }: Screen) => coarse && Math.min(width, height) < 600
export const needsRotate = (s: Screen) => isPhone(s) && s.height > s.width

type Lockable = { lock?: (o: string) => Promise<void> }

/**
 * Full screen, then the landscape lock (Chrome on Android allows both after a tap). Browsers that refuse (iPhone
 * Safari, desktop) are fine: the rotate screen covers phones held upright. Never throws.
 */
export async function lockLandscape(): Promise<boolean> {
  try {
    await document.documentElement.requestFullscreen?.()
  } catch {
    // no full screen: the lock below usually needs it, but try anyway
  }
  try {
    const o = (globalThis.screen as { orientation?: Lockable } | undefined)?.orientation
    if (!o?.lock) return false
    await o.lock('landscape')
    return true
  } catch {
    return false
  }
}
