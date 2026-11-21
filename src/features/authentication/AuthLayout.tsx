import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CircleAlert, CircleCheck } from 'lucide-react'
import { buttonClasses, FitToScreen, Panel } from '../../components/ui'
import { useShortScreen } from '../../app/useShortScreen'
import { LanguagePicker } from '../../i18n/LanguagePicker'
import { SceneBackdrop } from '../landing/SceneBackdrop'

export function AuthLayout({ title, children, back = '/welcome' }: { title: string; children: ReactNode; back?: string }) {
  const { t } = useTranslation()
  const short = useShortScreen()
  const panel = <Panel title={title}>{children}</Panel>
  return (
    <main className="relative min-h-dvh short:h-dvh short:overflow-hidden">
      <SceneBackdrop />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-4 pb-10 short:h-dvh short:max-w-none short:flex-row short:gap-4 short:px-4 short:pt-3 short:pb-3">
        <div className="flex items-center justify-between gap-3 short:flex-col short:items-start short:justify-start">
          <Link to={back} className={buttonClasses('secondary', 'md')}>
            <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden /> {t('common.back')}
          </Link>
          <LanguagePicker />
        </div>
        {/* Phones held sideways: the form fills the screen beside the back/language column and shrinks to fit when a
            larger font or display size would make it scroll. */}
        {short ? (
          <FitToScreen center className="h-full min-w-0 flex-1">
            <div className="pt-4">{panel}</div>
          </FitToScreen>
        ) : (
          <div className="flex flex-1 flex-col justify-center pt-10">{panel}</div>
        )}
      </div>
    </main>
  )
}

/** Inline status message: errors are announced immediately, successes politely. */
export function FormMessage({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const error = kind === 'error'
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-xl border-2 p-3 text-sm font-semibold ${error ? 'border-danger bg-danger/10 text-ink' : 'border-grass-dark bg-grass/15 text-ink'}`}
    >
      {error ? <CircleAlert size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden /> : <CircleCheck size={18} className="mt-0.5 shrink-0 text-grass-dark" aria-hidden />}
      <div>{children}</div>
    </div>
  )
}

export function ShowPasswordToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-grass-dark" />
      {t('auth.showPassword')}
    </label>
  )
}
