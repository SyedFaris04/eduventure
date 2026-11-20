import { isAuthError } from '@supabase/supabase-js'
import { supabase } from '../../services/supabase'
import { ageBandFromBirthYear } from './ageBand'
import { appUrl } from '../../app/base'

/** Error carrying an i18n key so every screen can show the same plain-language message. */
export class AuthMessageError extends Error {
  constructor(public key: string) {
    super(key)
  }
}

export function mapAuthError(e: unknown): AuthMessageError {
  if (isAuthError(e)) {
    switch (e.code) {
      case 'anonymous_provider_disabled':
        return new AuthMessageError('auth.errors.anonDisabled')
      case 'invalid_credentials':
        return new AuthMessageError('auth.errors.invalid')
      case 'email_not_confirmed':
        return new AuthMessageError('auth.errors.notConfirmed')
      case 'email_address_not_authorized': // Supabase's built-in mailer only sends to project team members
        return new AuthMessageError('auth.errors.emailNotAuthorized')
      case 'weak_password':
        return new AuthMessageError('auth.validation.password')
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        return new AuthMessageError('auth.errors.rateLimit')
    }
    if (e.status === 429) return new AuthMessageError('auth.errors.rateLimit')
    if (e.name === 'AuthRetryableFetchError' || e.status === 0) return new AuthMessageError('welcome.offline')
    if (/anonymous sign-ins are disabled/i.test(e.message)) return new AuthMessageError('auth.errors.anonDisabled')
  }
  return new AuthMessageError('auth.errors.generic')
}

function client() {
  if (!supabase) throw new AuthMessageError('welcome.offline')
  return supabase
}


export async function startGuest(): Promise<void> {
  const { error } = await client().auth.signInAnonymously()
  if (error) throw mapAuthError(error)
}

export async function signUp(v: { birthYear: number; email: string; password: string }): Promise<void> {
  const under13 = ageBandFromBirthYear(v.birthYear) === 'under13'
  const { error } = await client().auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      // The database trigger reads these; for under-13s the account email is the guardian's.
      data: { birth_year: v.birthYear, ...(under13 ? { guardian_email: v.email } : {}) },
      emailRedirectTo: appUrl('/login?verified=1'),
    },
  })
  if (error) throw mapAuthError(error)
}

export async function logIn(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email, password })
  if (error) throw mapAuthError(error)
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: appUrl('/update-password') })
  if (error) throw mapAuthError(error)
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await client().auth.updateUser({ password })
  if (error) throw mapAuthError(error)
}

/** Guest → full account. Supabase emails a confirmation link; the password is chosen after confirming. */
export async function upgradeGuest(email: string): Promise<void> {
  const { error } = await client().auth.updateUser({ email }, { emailRedirectTo: appUrl('/update-password?upgrade=1') })
  if (error) throw mapAuthError(error)
}

export async function signOut(): Promise<void> {
  await client().auth.signOut()
}
