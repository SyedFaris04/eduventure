// A parent who has to log in or create an account first keeps the child's code on this device until they approve.
const KEY = 'eduventure.parentCode'

export function savePendingCode(code: string) {
  try {
    localStorage.setItem(KEY, code)
  } catch {
    /* storage blocked: the parent can type the code */
  }
}

export function peekPendingCode(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function takePendingCode(): string | null {
  const code = peekPendingCode()
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  return code
}

// A teacher (or parent) sent to log in comes back to the page they started from.
const RETURN = 'eduventure.returnTo'
export function saveReturnTo(path: '/teacher' | '/parent') {
  try {
    sessionStorage.setItem(RETURN, path)
  } catch {
    /* ignore */
  }
}

/** Where to go after logging in: the parent page while a child's code waits, else a saved page, else Home. */
export function afterLoginPath(): string {
  if (peekPendingCode()) return '/parent'
  try {
    const to = sessionStorage.getItem(RETURN)
    sessionStorage.removeItem(RETURN)
    if (to === '/teacher' || to === '/parent') return to
  } catch {
    /* ignore */
  }
  return '/home'
}
