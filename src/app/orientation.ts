/**
 * Phones play sideways (owner's choice). A phone: a touch device whose *screen* (not window: a tablet in split screen
 * has a narrow window) has a short side under 600 CSS px.
 */
export const isPhone = ({ screenShort, coarse }: { screenShort: number; coarse: boolean }) => coarse && screenShort < 600

// Pages people open from a message or use outside play stay usable upright: a parent approving from WhatsApp, a
// password reset from email, teachers and admins.
const UPRIGHT_OK = ['/parent', '/teacher', '/admin', '/login', '/signup', '/reset-password', '/update-password', '/styleguide']
export const rotateApplies = (path: string) => !UPRIGHT_OK.some((p) => path === p || path.startsWith(`${p}/`))

export const needsRotate = (s: { width: number; height: number; screenShort: number; coarse: boolean }, path: string) =>
  isPhone(s) && s.height > s.width && rotateApplies(path)

/** This device, now. */
export const screenNow = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  screenShort: Math.min(window.screen?.width ?? window.innerWidth, window.screen?.height ?? window.innerHeight),
  coarse: window.matchMedia?.('(pointer: coarse)').matches ?? false,
})

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
