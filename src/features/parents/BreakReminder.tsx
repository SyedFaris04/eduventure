import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Coffee } from 'lucide-react'
import { Button, buttonClasses } from '../../components/ui'

const EVERY = 40 // minutes of continuous play between reminders

/** A friendly stretch-break card after every 40 minutes of play this session. No pressure either way. */
export function BreakReminder({ minutes }: { minutes: number }) {
  const { t } = useTranslation()
  const [nextAt, setNextAt] = useState(EVERY)
  if (minutes < nextAt) return null
  return (
    <div role="dialog" aria-label={t('parents.breakTitle')} className="pointer-events-auto fixed inset-x-3 top-24 z-40 mx-auto flex max-w-sm flex-col gap-2 rounded-2xl border-[3px] border-wood bg-cream p-4 text-center shadow-[0_4px_0_var(--color-wood-dark)]">
      <Coffee size={32} className="mx-auto text-path-dark" aria-hidden />
      <p className="font-display text-lg font-bold">{t('parents.breakTitle')}</p>
      <p className="text-sm">{t('parents.breakText')}</p>
      <div className="flex justify-center gap-2">
        <Link to="/home" className={buttonClasses('primary', 'md')}>
          {t('parents.takeBreak')}
        </Link>
        <Button variant="secondary" onClick={() => setNextAt(minutes + EVERY)}>
          {t('parents.keepPlaying')}
        </Button>
      </div>
    </div>
  )
}
