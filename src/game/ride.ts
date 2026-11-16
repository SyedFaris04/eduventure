import { isUnlocked } from './unlocks'

const SAILED = 'eduventure.sailed'

/** How long the boat ride plays: the swift perahu (level 7) is quicker; reduced motion gets a short fade. */
export const rideMs = (level: number, reduced: boolean) => (reduced ? 1200 : isUnlocked(level, 'boat', 'swift_perahu') ? 4000 : 7000)

/** The ride ends only once it has played long enough AND the destination has loaded, so nobody lands on an empty island. */
export const rideOver = (startedAt: number, now: number, durationMs: number, loaded: boolean) => loaded && now - startedAt >= durationMs

/** Skip appears from the second ride on. */
export function canSkip(): boolean {
  try {
    return localStorage.getItem(SAILED) === '1'
  } catch {
    return false
  }
}

export function markSailed() {
  try {
    localStorage.setItem(SAILED, '1')
  } catch {
    // not remembered; Skip just appears later
  }
}
