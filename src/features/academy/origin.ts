const FROM = 'eduventure.academyFrom'

/** Where "back" goes from the Academy: the world when the learner came from Cikgu Byte, otherwise Home. */
export function setAcademyOrigin(from: 'world' | 'home') {
  try {
    sessionStorage.setItem(FROM, from)
  } catch {
    // back goes Home
  }
}

export function academyOrigin(): '/world' | '/home' {
  try {
    return sessionStorage.getItem(FROM) === 'world' ? '/world' : '/home'
  } catch {
    return '/home'
  }
}
