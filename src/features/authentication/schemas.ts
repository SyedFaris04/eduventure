import { z } from 'zod'
import { ageBandFromBirthYear } from './ageBand'

// Messages are i18n keys; forms translate them when showing the error.
const email = z.email('auth.validation.email')
const newPassword = z.string().min(10, 'auth.validation.password').max(72, 'auth.validation.password')

export const BIRTH_YEAR_SPAN = { minAge: 3, maxAge: 100 }

export function makeSignupSchema(now: Date = new Date()) {
  const year = now.getFullYear()
  return z
    .object({
      birthYear: z
        .number('auth.validation.birthYear')
        .int('auth.validation.birthYear')
        .min(year - BIRTH_YEAR_SPAN.maxAge, 'auth.validation.birthYear')
        .max(year - BIRTH_YEAR_SPAN.minAge, 'auth.validation.birthYear'),
      email,
      password: newPassword,
      guardianConsent: z.boolean(),
    })
    .refine((d) => ageBandFromBirthYear(d.birthYear, now) !== 'under13' || d.guardianConsent, {
      path: ['guardianConsent'],
      message: 'auth.validation.consent',
    })
}
export type SignupValues = z.infer<ReturnType<typeof makeSignupSchema>>

export const loginSchema = z.object({ email, password: z.string().min(1, 'auth.validation.passwordRequired') })
export type LoginValues = z.infer<typeof loginSchema>

export const emailOnlySchema = z.object({ email })
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>

export const newPasswordSchema = z.object({ password: newPassword })
export type NewPasswordValues = z.infer<typeof newPasswordSchema>
