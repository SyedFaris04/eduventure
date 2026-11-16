import { useTranslation } from 'react-i18next'
import { Divide, Shield } from 'lucide-react'
import { isUnlocked, unlockLevel } from '../../game/unlocks'
import type { Helpers } from './battleApi'
import type { PublicQuestion } from './questionSchema'

/** True when 50/50 can apply: a choice question with at least two wrong options (the server checks too). */
const fiftyFits = (q: PublicQuestion | null) => Boolean(q && (q.type === 'mcq' || q.type === 'multi_select') && Array.isArray(q.options) && q.options.length >= 3)

/** Battle helpers: the automatic Second Chance badge and the 50/50 button. */
export function HelperBar({ level, helpers, question, onFifty, busy }: { level: number; helpers: Helpers; question: PublicQuestion | null; onFifty: () => void; busy?: boolean }) {
  const { t } = useTranslation()
  const secondOpen = isUnlocked(level, 'helper', 'second_chance')
  const fiftyOpen = isUnlocked(level, 'helper', 'fifty')
  const fits = fiftyFits(question)
  const reason = !fiftyOpen ? t('battle.helpers.locked', { level: unlockLevel('helper', 'fifty') }) : helpers.fifty_used ? t('battle.helpers.fiftyUsed') : !fits ? t('battle.helpers.fiftyNeedsOptions') : undefined

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
      <span className={`flex items-center gap-1 rounded-full border-2 px-2 py-0.5 ${secondOpen && helpers.second_chance_left ? 'border-grass-dark bg-grass/30' : 'border-wood/40 bg-cream text-wood-dark/70'}`}>
        <Shield size={14} aria-hidden />
        {!secondOpen ? t('battle.helpers.secondLocked', { level: unlockLevel('helper', 'second_chance') }) : helpers.second_chance_left ? t('battle.helpers.secondReady') : t('battle.helpers.secondUsed')}
      </span>
      <button
        type="button"
        onClick={onFifty}
        disabled={Boolean(reason) || busy}
        title={reason}
        aria-label={reason ? `50/50 — ${reason}` : '50/50'}
        className="flex items-center gap-1 rounded-full border-2 border-wood-dark bg-gold px-2 py-0.5 disabled:border-wood/40 disabled:bg-cream disabled:text-wood-dark/60"
      >
        <Divide size={14} aria-hidden /> 50/50
        {!fiftyOpen && <span>· {t('battle.helpers.levelShort', { level: unlockLevel('helper', 'fifty') })}</span>}
      </button>
    </div>
  )
}
