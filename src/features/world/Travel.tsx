import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FastForward, Sailboat } from 'lucide-react'
import { Button } from '../../components/ui'
import type { Appearance } from '../character/appearance'
import type { GameMap } from '../../game/map'
import { placeMap } from '../../game/placeMaps'
import { setPlace } from '../../game/placeStore'
import type { PlaceId } from '../../game/places'
import { canSkip, markSailed, rideMs, rideOver } from '../../game/ride'
import { useGame } from '../../game/store'
import { usePlayerLevel } from '../battle/BattlePanel'

const BoatRide = lazy(() => import('../../world3d/BoatRide'))
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Sailing to another place. The destination downloads while the ride plays; the ride ends only when both are
 * done. A failed download is thrown to the world's error boundary, which shows Retry.
 */
export function Travel({ hero, to }: { hero: Appearance; to: PlaceId }) {
  const { t } = useTranslation()
  const { level } = usePlayerLevel()
  const reduced = useMemo(reducedMotion, [])
  const [startedAt] = useState(() => performance.now())
  const [skippable] = useState(canSkip)
  const [skip, setSkip] = useState(false)
  const [map, setMap] = useState<GameMap | null>(null)
  const [failed, setFailed] = useState<unknown>(null)
  const duration = skip ? 0 : rideMs(level, reduced)
  const place = t(`regions.${to}.name`)

  useEffect(() => {
    let live = true
    placeMap(to).then(
      (m) => live && setMap(m),
      (e) => live && setFailed(e ?? new Error('load failed')),
    )
    return () => {
      live = false
    }
  }, [to])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!rideOver(startedAt, performance.now(), duration, Boolean(map))) return
      window.clearInterval(id)
      markSailed()
      setPlace(to)
      useGame.setState({ travel: null, area: null })
    }, 100)
    return () => window.clearInterval(id)
  }, [startedAt, duration, map, to])

  if (failed) throw failed

  return (
    <div className="absolute inset-0" aria-label={t('ride.label')}>
      {!reduced && (
        <Suspense fallback={null}>
          <BoatRide hero={hero} theme={map?.theme ?? 'kampung'} durationMs={rideMs(level, false)} startedAt={startedAt} />
        </Suspense>
      )}
      <div className={`pointer-events-none absolute inset-x-0 top-1/4 grid place-items-center p-4 ${reduced ? 'inset-0 top-0 bg-[#5fb3d9]' : ''}`}>
        <p role="status" className="flex items-center gap-2 rounded-2xl border-[3px] border-wood bg-cream/95 px-4 py-2 font-display text-xl font-bold text-wood-dark shadow-[0_4px_0_var(--color-wood-dark)]">
          <Sailboat aria-hidden /> {t('ride.sailingTo', { place })}
        </p>
      </div>
      {skippable && !skip && (
        <div className="pointer-events-auto absolute end-4 bottom-6">
          <Button variant="secondary" onClick={() => setSkip(true)}>
            <FastForward size={18} aria-hidden /> {t('ride.skip')}
          </Button>
        </div>
      )}
    </div>
  )
}
