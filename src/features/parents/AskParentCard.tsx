import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Clock, Copy, MessageCircle, ShieldCheck, Users } from 'lucide-react'
import { Button, buttonClasses } from '../../components/ui'
import { parentLink, whatsappLink } from './links'
import type { Guardian } from './useGuardian'

/** Home card for players under 18: ask a parent to approve, then show the parent's daily limit. */
export function AskParentCard({ guardian, busy, onAsk }: { guardian: Guardian | undefined; busy: boolean; onAsk: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  if (!guardian || guardian.status === 'not_needed') return null

  if (guardian.status === 'approved')
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-xl bg-grass/20 px-3 py-2 text-sm font-semibold">
        <ShieldCheck size={18} className="text-grass-dark" aria-hidden /> {t('parents.approved')}
        {guardian.minutes_left != null && (
          <span className="flex items-center gap-1">
            · <Clock size={14} aria-hidden /> <span>{t('parents.minutesLeft', { n: guardian.minutes_left })}</span>
          </span>
        )}
      </p>
    )

  const link = guardian.code ? parentLink(guardian.code) : ''
  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-water-dark/40 bg-water/15 p-3 text-sm">
      <p className="flex items-center gap-2 font-display text-base font-semibold">
        <Users size={18} aria-hidden /> {t('parents.askTitle')}
      </p>
      <p>{t('parents.askWhy')}</p>
      {guardian.status === 'none' ? (
        <Button onClick={onAsk} disabled={busy} className="self-start">
          {t('parents.ask')}
        </Button>
      ) : (
        <>
          <p>{t('parents.sendThis')}</p>
          <p className="self-start rounded-lg bg-white px-3 py-1 font-mono text-lg font-bold tracking-widest">{guardian.code}</p>
          <div className="flex flex-wrap gap-2">
            <a href={whatsappLink(t('parents.whatsappText', { link }))} target="_blank" rel="noreferrer" className={buttonClasses('primary', 'md')}>
              <MessageCircle size={18} aria-hidden /> {t('parents.whatsapp')}
            </a>
            <Button variant="secondary" onClick={() => void copy()}>
              {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {copied ? t('parents.copied') : t('parents.copy')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
