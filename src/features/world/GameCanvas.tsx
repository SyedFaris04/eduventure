import { Component, lazy, Suspense, use, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui'
import type { Appearance } from '../character/appearance'
import { hasWebGL } from '../../world3d/webgl'
import { usePlace } from '../../game/placeStore'
import { placeMap } from '../../game/placeMaps'

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
function PlaceWorld({ hero }: { hero: Appearance }) {
  const place = usePlace((s) => s.place)
  const arriving = usePlace((s) => s.arriving)
  const map = use(placeMap(place))
  return <World3D key={place} hero={hero} map={map} atArrival={arriving} />
}

/** The 3D world, or a clear message when this device can't show it or the download failed. */
export function GameCanvas({ hero }: { hero: Appearance }) {
  const { t } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  if (!hasWebGL())
    return (
      <Notice>
        <p>{t('world.noWebgl')}</p>
      </Notice>
    )
  return (
    <div role="application" aria-label={t('world.canvasLabel')} className="absolute inset-0 touch-none">
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
          <PlaceWorld hero={hero} />
        </Suspense>
      </Boundary>
    </div>
  )
}
