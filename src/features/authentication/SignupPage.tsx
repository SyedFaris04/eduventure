import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck, ShieldCheck } from 'lucide-react'
import { Button, Field, Select } from '../../components/ui'
import { AuthLayout, FormMessage, ShowPasswordToggle } from './AuthLayout'
import { AuthMessageError, signUp } from './authActions'
import { ageBandFromBirthYear } from './ageBand'
import { BIRTH_YEAR_SPAN, makeSignupSchema, type SignupValues } from './schemas'
import { useSessionStore } from './useSession'

export function SignupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const schema = useMemo(() => makeSignupSchema(), [])
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<{ email: string; guardian: boolean } | null>(null)
  const { register, handleSubmit, watch, formState } = useForm<SignupValues>({
    resolver: zodResolver(schema),
    defaultValues: { guardianConsent: false },
  })
  const err = (m?: string) => (m ? t(m) : undefined)

  const year = new Date().getFullYear()
  const years = useMemo(() => Array.from({ length: BIRTH_YEAR_SPAN.maxAge - BIRTH_YEAR_SPAN.minAge + 1 }, (_, i) => year - BIRTH_YEAR_SPAN.minAge - i), [year])
  const birthYear = watch('birthYear')
  const under13 = Number.isInteger(birthYear) && ageBandFromBirthYear(birthYear) === 'under13'

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      await signUp(v)
      // Projects with email confirmation off sign the player in straight away.
      if (useSessionStore.getState().session) navigate('/onboarding', { replace: true })
      else setSentTo({ email: v.email, guardian: under13 })
    } catch (e) {
      setFormError(e instanceof AuthMessageError ? e.key : 'auth.errors.generic')
    }
  })

  if (sentTo) {
    return (
      <AuthLayout title={t('auth.checkEmailTitle')}>
        <div className="flex flex-col items-center gap-4 text-center">
          <MailCheck size={56} className="text-grass-dark" aria-hidden />
          <p role="status" className="font-semibold">
            {t(sentTo.guardian ? 'auth.checkEmailGuardian' : 'auth.checkEmail', { email: sentTo.email })}
          </p>
          <Link to="/login" className="text-water-dark underline">
            {t('auth.haveAccount')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.signupTitle')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <FormMessage kind="error">{t(formError)}</FormMessage>}
        <Select
          label={t('auth.birthYear')}
          hint={t('auth.birthYearHint')}
          defaultValue=""
          error={err(formState.errors.birthYear?.message)}
          {...register('birthYear', { valueAsNumber: true })}
        >
          <option value="" disabled>
            {t('auth.chooseYear')}
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>

        {under13 && (
          <div className="flex gap-3 rounded-xl border-2 border-water-dark bg-water/25 p-3 text-sm">
            <ShieldCheck className="shrink-0 text-water-dark" aria-hidden />
            <p className="font-semibold">{t('auth.under13Notice')}</p>
          </div>
        )}

        <Field
          label={t(under13 ? 'auth.guardianEmail' : 'auth.email')}
          type="email"
          autoComplete="email"
          error={err(formState.errors.email?.message)}
          {...register('email')}
        />
        <Field
          label={t('auth.password')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          error={err(formState.errors.password?.message)}
          {...register('password')}
        />
        <ShowPasswordToggle checked={showPassword} onChange={setShowPassword} />

        {under13 && (
          <div className="flex flex-col gap-1">
            <label className="flex cursor-pointer items-start gap-2 text-sm font-semibold">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-grass-dark" {...register('guardianConsent')} />
              {t('auth.guardianConsent')}
            </label>
            {formState.errors.guardianConsent && (
              <p role="alert" className="text-sm font-semibold text-danger">
                {t(formState.errors.guardianConsent.message ?? 'auth.validation.consent')}
              </p>
            )}
          </div>
        )}

        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('common.loading') : t('auth.signupButton')}
        </Button>
        <Link to="/login" className="text-center text-sm font-semibold text-water-dark underline">
          {t('auth.haveAccount')}
        </Link>
      </form>
    </AuthLayout>
  )
}
