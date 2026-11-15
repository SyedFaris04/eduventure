import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Field } from '../../components/ui'
import { AuthLayout, FormMessage, ShowPasswordToggle } from './AuthLayout'
import { AuthMessageError, logIn } from './authActions'
import { loginSchema, type LoginValues } from './schemas'
import { useSession } from './useSession'

// shortcut: goes to onboarding until the progress guard (Task 9) decides the next screen.
const AFTER_LOGIN = '/onboarding'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session } = useSession()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const err = (m?: string) => (m ? t(m) : undefined)

  // Arriving from the confirmation link signs the player in automatically.
  useEffect(() => {
    if (session && !session.user.is_anonymous) navigate(AFTER_LOGIN, { replace: true })
  }, [session, navigate])

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null)
    try {
      await logIn(email, password)
      navigate(AFTER_LOGIN, { replace: true })
    } catch (e) {
      setFormError(e instanceof AuthMessageError ? e.key : 'auth.errors.generic')
    }
  })

  return (
    <AuthLayout title={t('auth.loginTitle')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {params.has('verified') && <FormMessage kind="success">{t('auth.verified')}</FormMessage>}
        {formError && <FormMessage kind="error">{t(formError)}</FormMessage>}
        <Field label={t('auth.email')} type="email" autoComplete="email" error={err(formState.errors.email?.message)} {...register('email')} />
        <Field
          label={t('auth.password')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={err(formState.errors.password?.message)}
          {...register('password')}
        />
        <ShowPasswordToggle checked={showPassword} onChange={setShowPassword} />
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('common.loading') : t('auth.loginButton')}
        </Button>
        <div className="flex flex-wrap justify-between gap-2 text-sm font-semibold">
          <Link to="/reset-password" className="text-water-dark underline">
            {t('auth.forgot')}
          </Link>
          <Link to="/signup" className="text-water-dark underline">
            {t('auth.noAccount')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
