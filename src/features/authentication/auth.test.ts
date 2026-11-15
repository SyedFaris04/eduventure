import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '@supabase/supabase-js'
import { ageBandFromBirthYear } from './ageBand'
import { makeSignupSchema, loginSchema } from './schemas'

const signInAnonymously = vi.fn()
vi.mock('../../services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { signInAnonymously: (...a: unknown[]) => signInAnonymously(...a) } },
}))
const { startGuest, mapAuthError } = await import('./authActions')

const JUNE_2026 = new Date('2026-06-01T00:00:00Z')

describe('ageBandFromBirthYear', () => {
  it('uses the youngest possible age for the year', () => {
    expect(ageBandFromBirthYear(2013, JUNE_2026)).toBe('under13')
    expect(ageBandFromBirthYear(2012, JUNE_2026)).toBe('teen')
    expect(ageBandFromBirthYear(2008, JUNE_2026)).toBe('teen')
    expect(ageBandFromBirthYear(2007, JUNE_2026)).toBe('adult')
  })
})

describe('signup schema', () => {
  const schema = makeSignupSchema(JUNE_2026)
  const valid = { birthYear: 2000, email: 'player@example.com', password: 'longenough1', guardianConsent: false }

  it('accepts a valid adult sign-up', () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it('rejects a short password', () => {
    expect(schema.safeParse({ ...valid, password: 'short' }).success).toBe(false)
  })

  it('rejects a birth year in the current year', () => {
    expect(schema.safeParse({ ...valid, birthYear: 2026 }).success).toBe(false)
  })

  it('requires guardian consent for under-13 players', () => {
    const child = { ...valid, birthYear: 2016 }
    const without = schema.safeParse(child)
    expect(without.success).toBe(false)
    expect(without.error?.issues[0].path).toEqual(['guardianConsent'])
    expect(schema.safeParse({ ...child, guardianConsent: true }).success).toBe(true)
  })
})

describe('login schema', () => {
  it('rejects a malformed email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })
})

describe('startGuest', () => {
  beforeEach(() => signInAnonymously.mockReset())

  it('explains where to switch guest play on when it is disabled', async () => {
    signInAnonymously.mockResolvedValue({
      data: { session: null, user: null },
      error: new AuthError('Anonymous sign-ins are disabled', 422, 'anonymous_provider_disabled'),
    })
    await expect(startGuest()).rejects.toMatchObject({ key: 'auth.errors.anonDisabled' })
  })

  it('resolves when the server creates the guest', async () => {
    signInAnonymously.mockResolvedValue({ data: { session: {}, user: {} }, error: null })
    await expect(startGuest()).resolves.toBeUndefined()
  })
})

describe('mapAuthError', () => {
  it('maps known codes to message keys', () => {
    expect(mapAuthError(new AuthError('x', 400, 'invalid_credentials')).key).toBe('auth.errors.invalid')
    expect(mapAuthError(new AuthError('x', 400, 'email_not_confirmed')).key).toBe('auth.errors.notConfirmed')
    expect(mapAuthError(new AuthError('x', 429, 'over_email_send_rate_limit')).key).toBe('auth.errors.rateLimit')
    expect(mapAuthError(new AuthError('x', 400, 'email_address_not_authorized')).key).toBe('auth.errors.emailNotAuthorized')
    expect(mapAuthError(new Error('weird')).key).toBe('auth.errors.generic')
  })
})
