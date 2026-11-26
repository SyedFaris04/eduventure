import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useGame } from '../../game/store'
import { FINISHER } from '../../world3d/finisher'

/**
 * The 2D half of the defeat cutscene (the 3D half is in World3D): cinema bars, the white flash on impact and the
 * VICTORY banner. It ends itself, or on a tap, and then the battle panel shows the rewards. The monster is also marked
 * defeated here, so it disappears even if the 3D world never drew a frame (no WebGL).
 */
export function FinisherOverlay() {
  const { t } = useTranslation()
  const fin = useGame((s) => s.finisher)
  const end = () =>
    useGame.setState((s) => (s.finisher ? { finisher: null, defeated: [...s.defeated, s.finisher.monsterId] } : {}))

  useEffect(() => {
    if (!fin) return
    const timer = setTimeout(end, FINISHER.duration)
    return () => clearTimeout(timer)
  }, [fin])

  if (!fin) return null
  return (
    <div role="status" aria-live="assertive" onPointerDown={end} className="finisher pointer-events-auto absolute inset-0 z-40 overflow-hidden">
      <div className="finisher-bar top-0" />
      <div className="finisher-bar bottom-0" />
      <div className="finisher-flash absolute inset-0 bg-white" />
      <div className="finisher-banner absolute inset-x-0 top-[22%] flex flex-col items-center gap-1 text-center">
        <p className="title-outline bg-gradient-to-b from-[#fff1a8] via-gold to-[#ef9b2f] bg-clip-text font-display text-6xl font-bold tracking-wide text-transparent short:text-5xl">
          {t('battle.victory')}
        </p>
        <p className="rounded-full bg-ink/60 px-4 py-1 font-display text-lg font-semibold text-cream short:text-base">{t('battle.finisher', { name: fin.name })}</p>
      </div>
    </div>
  )
}
