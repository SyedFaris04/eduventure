import type { Pet } from '../pet/petRules'
import { Component, lazy, Suspense, use, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui'
import type { Appearance } from '../character/appearance'
import { hasWebGL } from '../../world3d/webgl'
import { usePlace } from '../../game/placeStore'
import { placeMap } from '../../game/placeMaps'
import { useGame } from '../../game/store'
import { Travel } from './Travel'

// three.js and the models download only when the world opens.
const World3D = lazy(() => import('../../world3d/World3D'))

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 grid place-items-center p-6 text-center">{<div className="pointer-events-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border-[3px] border-wood bg-cream/95 p-5 font-semibold text-wood-dark">{children}</div>}</div>
}

/** The current place: its map downloads on demand (Suspense), then the 3D world shows it. */
function PlaceWorld({ hero, pet }: { hero: Appearance; pet?: Pet | null }) {
  const travel = useGame((s) => s.travel)
  return travel ? <Travel hero={hero} to={travel.to} /> : <CurrentPlace hero={hero} pet={pet} />
}

function CurrentPlace({ hero, pet }: { hero: Appearance; pet?: Pet | null }) {
  const place = usePlace((s) => s.place)
  const arriving = usePlace((s) => s.arriving)
  const map = use(placeMap(place))
  // Coming back from the Code Academy: start where the player left, not at the jetty. The spot is cleared only
  // once the world has really appeared, because the map download can make React throw the first render away.
  const resumeAt = usePlace((s) => s.resumeAt)
  useEffect(() => {
    if (usePlace.getState().resumeAt) usePlace.setState({ resumeAt: null })
  }, [])
  return <World3D key={place} hero={hero} pet={pet} map={map} atArrival={arriving} startAt={resumeAt ?? undefined} />
}

/** The 3D world, or a clear message when this device can't show it or the download failed. */
export function GameCanvas({ hero, pet }: { hero: Appearance; pet?: Pet | null }) {
  const { t } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  const place = usePlace((s) => s.place)
  if (!hasWebGL())
    return (
      <Notice>
        <p>{t('world.noWebgl')}</p>
      </Notice>
    )
  return (
    <div role="application" aria-label={t('world.canvasLabel', { place: t(`regions.${place}.name`) })} className="absolute inset-0 touch-none">
      <Boundary
        key={attempt}
        fallback={
          <Notice>
            <p>{t('world.loadFailed')}</p>
            <Button
              onClick={() =>
                // A failed download stays cached by the loader; clear it so the retry really fetches again.
                void import('../../world3d/World3D')
                  .then((m) => (m as { clearWorldCache?: () => void }).clearWorldCache?.())
                  .catch(() => undefined)
                  .finally(() => setAttempt((a) => a + 1))
              }
            >
              <RefreshCw size={18} aria-hidden /> {t('world.retry')}
            </Button>
          </Notice>
        }
      >
        <Suspense fallback={null}>
          <PlaceWorld hero={hero} pet={pet} />
        </Suspense>
      </Boundary>
    </div>
  )
}
