import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Appearance } from '../character/appearance'

/** Mounts the Phaser game; Phaser itself is downloaded only when this component first renders. */
export function GameCanvas({ hero }: { hero: Appearance }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let game: { destroy: (removeCanvas: boolean) => void } | undefined
    void import('../../game/createGame').then(({ createGame }) => {
      if (cancelled || !ref.current) return
      game = createGame(ref.current, { hero })
    })
    return () => {
      cancelled = true
      game?.destroy(true)
    }
  }, [hero])

  return <div ref={ref} role="application" aria-label={t('world.canvasLabel')} className="absolute inset-0 touch-none" />
}
