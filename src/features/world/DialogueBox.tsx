import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, X } from 'lucide-react'
import { useGame } from '../../game/store'
import { NPCS } from '../../game/npcs'
import { Snapshot } from '../../world3d/SnapshotImage'

/** Paged NPC dialogue. Enter / Space / E advance, Escape closes; the world is paused while open. */
export function DialogueBox({ playerName }: { playerName: string }) {
  const { t } = useTranslation()
  const dialogue = useGame((s) => s.dialogue)
  const nextRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!dialogue) return
    nextRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useGame.setState({ dialogue: null })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialogue])

  if (!dialogue) return null
  const npc = NPCS[dialogue.npc]
  const pages = t(`npc.${dialogue.npc}.pages`, { returnObjects: true, name: playerName }) as string[]
  const last = dialogue.page >= pages.length - 1
  const advance = () => useGame.setState({ dialogue: last ? null : { ...dialogue, page: dialogue.page + 1 } })

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 mx-auto max-w-2xl">
      <section
        role="dialog"
        aria-label={t(`npc.${dialogue.npc}.name`)}
        className="relative flex gap-3 rounded-3xl border-4 border-wood bg-cream p-4 shadow-[0_0_0_3px_var(--color-wood-dark),0_10px_24px_rgb(0_0_0/0.3)]"
      >
        <Snapshot subject={{ kind: 'hero', appearance: npc.appearance }} px={96} alt="" className="-mt-12 w-20 shrink-0 self-start sm:w-24" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="font-display text-lg font-semibold text-wood-dark">{t(`npc.${dialogue.npc}.name`)}</p>
          <p aria-live="polite" className="text-base leading-snug">
            {pages[dialogue.page]}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-wood-dark/70">
              {dialogue.page + 1} / {pages.length}
            </span>
            <button
              ref={nextRef}
              type="button"
              onClick={advance}
              className="flex items-center gap-1 rounded-xl border-[3px] border-wood-dark bg-gradient-to-b from-gold to-path-dark px-4 py-1.5 font-display font-semibold shadow-[0_3px_0_var(--color-wood-dark)]"
            >
              {last ? t('common.close') : t('common.next')} <ChevronRight size={18} className="rtl:rotate-180" aria-hidden />
            </button>
          </div>
        </div>
        <button type="button" onClick={() => useGame.setState({ dialogue: null })} aria-label={t('common.close')} className="absolute end-2 top-2 rounded-lg p-1 hover:bg-wood/10">
          <X size={18} aria-hidden />
        </button>
      </section>
    </div>
  )
}
