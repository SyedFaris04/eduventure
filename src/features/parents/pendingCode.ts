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
