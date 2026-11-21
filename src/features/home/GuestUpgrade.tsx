import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Field, Panel } from '../../components/ui'
import { FormMessage } from '../authentication/AuthLayout'
import { AuthMessageError, upgradeGuest } from '../authentication/authActions'
import { emailOnlySchema, type EmailOnlyValues } from '../authentication/schemas'

/** Guests add an email (or a guardian's, under 13) to keep their hero on any device. */
export function GuestUpgrade({ under13 }: { under13: boolean }) {
  const { t } = useTranslation()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<EmailOnlyValues>({ resolver: zodResolver(emailOnlySchema) })

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null)
    try {
      await upgradeGuest(email)
      setSentTo(email)
    } catch (e) {
      setFormError(e instanceof AuthMessageError ? e.key : 'auth.errors.generic')
    }
  })

  return (
    <Panel title={t('home.guestTitle')}>
      {sentTo ? (
        <FormMessage kind="success">{t('home.linkSent', { email: sentTo })}</FormMessage>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <p className="text-sm">{t(under13 ? 'home.guestIntroU13' : 'home.guestIntro')}</p>
          {formError && <FormMessage kind="error">{t(formError)}</FormMessage>}
          <Field
            label={t(under13 ? 'auth.guardianEmail' : 'auth.email')}
            type="email"
            autoComplete="email"
            error={formState.errors.email?.message && t(formState.errors.email.message)}
            {...register('email')}
          />
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('common.loading') : t('home.sendLink')}
          </Button>
        </form>
      )}
    </Panel>
  )
}
