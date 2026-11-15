import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CircleAlert, CircleCheck } from 'lucide-react'
import { buttonClasses, Panel } from '../../components/ui'
import { LanguagePicker } from '../../i18n/LanguagePicker'
import { SceneBackdrop } from '../landing/SceneBackdrop'

export function AuthLayout({ title, children, back = '/welcome' }: { title: string; children: ReactNode; back?: string }) {
  const { t } = useTranslation()
  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-4 pb-10">
        <div className="flex items-center justify-between gap-3">
          <Link to={back} className={buttonClasses('secondary', 'md')}>
            <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden /> {t('common.back')}
          </Link>
          <LanguagePicker />
        </div>
        <div className="flex flex-1 flex-col justify-center pt-10">
          <Panel title={title}>{children}</Panel>
        </div>
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
