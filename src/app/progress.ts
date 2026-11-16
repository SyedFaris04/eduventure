export type ProgressState = { session: boolean; hasAcademicProfile: boolean; hasCharacter: boolean }
export type RequiredRoute = '/welcome' | '/onboarding' | '/character'

/** The first setup step this player still has to do, or null when they are ready to play. */
export function nextRequiredRoute(s: ProgressState): RequiredRoute | null {
  if (!s.session) return '/welcome'
  if (!s.hasAcademicProfile) return '/onboarding'
  if (!s.hasCharacter) return '/character'
  return null
}

/** Where to send a player who opens `path`, or null if they may stay. */
export function guardRedirect(path: string, s: ProgressState): string | null {
  const next = nextRequiredRoute(s)
  if (next === '/welcome') return '/welcome'
  switch (path) {
    case '/onboarding':
      // Finished onboarding is edited in Settings, never restarted from a blank form.
      return s.hasAcademicProfile ? (next ?? '/home') : null
    case '/character':
      return s.hasAcademicProfile ? null : '/onboarding'
    default: // /home, /settings/academic and anything else that needs a complete setup
      return next
  }
}
