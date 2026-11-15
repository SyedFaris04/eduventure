import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Field } from '../../components/ui'
import { AuthLayout, FormMessage, ShowPasswordToggle } from './AuthLayout'
import { AuthMessageError, updatePassword } from './authActions'
import { newPasswordSchema, type NewPasswordValues } from './schemas'
import { useSession } from './useSession'

/** Landing page for password-reset links and for guests who just confirmed their new email. */
export function UpdatePasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, loading } = useSession()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) })

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null)
    try {
      await updatePassword(password)
      // shortcut: onboarding until the progress guard (Task 9) picks the next screen.
      navigate('/onboarding', { replace: true })
    } catch (e) {
      setFormError(e instanceof AuthMessageError ? e.key : 'auth.errors.generic')
    }
  })

  const title = t(params.has('upgrade') ? 'auth.choosePasswordTitle' : 'auth.updateTitle')

  if (loading) return <AuthLayout title={title}>{t('common.loading')}</AuthLayout>

  if (!session || session.user.is_anonymous) {
    return (
      <AuthLayout title={title} back="/login">
        <div className="flex flex-col gap-4">
          <FormMessage kind="error">{t('auth.linkExpired')}</FormMessage>
          <Link to="/reset-password" className="text-center font-semibold text-water-dark underline">
            {t('auth.resetButton')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={title} back="/login">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <FormMessage kind="error">{t(formError)}</FormMessage>}
        <Field
          label={t('auth.newPassword')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          error={formState.errors.password?.message && t(formState.errors.password.message)}
          {...register('password')}
        />
        <ShowPasswordToggle checked={showPassword} onChange={setShowPassword} />
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('common.loading') : t('auth.updateButton')}
        </Button>
      </form>
    </AuthLayout>
  )
}
