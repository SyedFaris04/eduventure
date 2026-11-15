import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Field } from '../../components/ui'
import { AuthLayout, FormMessage } from './AuthLayout'
import { AuthMessageError, requestPasswordReset } from './authActions'
import { emailOnlySchema, type EmailOnlyValues } from './schemas'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<EmailOnlyValues>({ resolver: zodResolver(emailOnlySchema) })

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null)
    try {
      await requestPasswordReset(email)
      setSent(true) // same message whether or not the account exists, so emails cannot be probed
    } catch (e) {
      setFormError(e instanceof AuthMessageError ? e.key : 'auth.errors.generic')
    }
  })

  return (
    <AuthLayout title={t('auth.resetTitle')} back="/login">
      {sent ? (
        <FormMessage kind="success">{t('auth.resetSent')}</FormMessage>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {formError && <FormMessage kind="error">{t(formError)}</FormMessage>}
          <Field
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            error={formState.errors.email?.message && t(formState.errors.email.message)}
            {...register('email')}
          />
          <Button type="submit" size="lg" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('common.loading') : t('auth.resetButton')}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
