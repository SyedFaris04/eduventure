import { useTranslation } from 'react-i18next'
import { Coins } from 'lucide-react'
import { ProgressBar } from '../../components/ui'
import { levelProgress } from '../../game/levels'
import { characterDataUri } from '../character/renderCharacterSvg'
import type { MyCharacter } from '../character/useCharacter'

/** Player card: compact strip on phones, card on larger screens. Values come from the server. */
export function Hud({ character, xp, gold }: { character: MyCharacter; xp: number; gold: number }) {
  const { t } = useTranslation()
  const p = levelProgress(xp)
  return (
    <section
      aria-label={t('world.hud')}
      className="pointer-events-auto absolute start-3 top-3 z-10 flex w-[min(calc(100vw-5.5rem),20rem)] items-center gap-3 rounded-2xl border-[3px] border-wood bg-cream/95 p-2 shadow-[0_4px_0_var(--color-wood-dark)]"
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-xl border-2 border-wood/50 bg-water/40 sm:size-14">
        <img src={characterDataUri(character.appearance, { size: 72 })} alt="" className="-mt-1 w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-display font-semibold">{character.name}</p>
          <p className="shrink-0 rounded-full bg-wood px-2 text-xs font-bold text-cream">{t('world.levelShort', { level: p.level })}</p>
        </div>
        <ProgressBar value={p.into / p.needed} label={t('world.xpLabel', { into: p.into, needed: p.needed })} className="mt-1 h-4!" />
        <div className="mt-0.5 flex justify-between text-xs font-bold text-wood-dark">
          <span>
            {p.into} / {p.needed} XP
          </span>
          <span className="flex items-center gap-1">
            <Coins size={14} className="text-path-dark" aria-hidden /> {gold}
          </span>
        </div>
      </div>
    </section>
  )
}
