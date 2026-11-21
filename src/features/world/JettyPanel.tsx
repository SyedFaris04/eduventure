import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Anchor, Clock, MapPin, Sailboat, X } from 'lucide-react'
import { Button } from '../../components/ui'
import { useGame } from '../../game/store'
import { PLACES, type PlaceId } from '../../game/places'
import { usePlace } from '../../game/placeStore'

/** The boatman's list of places: sail to any built island; the next projects' islands say "Coming soon". */
export function JettyPanel({ returning = {} }: { returning?: Record<string, number> }) {
  const { t } = useTranslation()
  const open = useGame((s) => s.jetty)
  const here = usePlace((s) => s.place)
  const close = () => useGame.setState({ jetty: false })

  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])

  if (!open) return null
  const sail = (to: PlaceId) => useGame.setState({ jetty: false, travel: { to } })

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/45 p-3 short:p-1">
      <section role="dialog" aria-modal="true" aria-label={t('jetty.title')} className="relative w-full max-w-md rounded-3xl border-4 border-wood bg-cream p-4 shadow-[0_0_0_3px_var(--color-wood-dark),0_16px_40px_rgb(0_0_0/0.4)] short:max-w-3xl short:p-3">
        <button type="button" onClick={close} aria-label={t('common.close')} className="absolute end-3 top-3 rounded-lg p-1 hover:bg-wood/10">
          <X size={20} aria-hidden />
        </button>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-wood-dark short:text-xl">
          <Anchor aria-hidden /> {t('jetty.title')}
        </h2>
        <p className="mt-1 text-sm font-semibold text-wood-dark/90">{t('jetty.greeting')}</p>
        <ul className="mt-3 space-y-2 short:mt-2 short:grid short:grid-cols-2 short:gap-2 short:space-y-0">
          {(Object.keys(PLACES) as PlaceId[]).map((id) => {
            const name = t(`regions.${id}.name`)
            return (
              <li key={id} className="flex items-center justify-between gap-2 rounded-2xl border-[3px] border-wood/40 bg-white/85 px-3 py-2 short:py-1">
                <span className="flex flex-col">
                  <span className="font-display text-lg font-semibold">{name}</span>
                  {(returning[id] ?? 0) > 0 && <span className="text-xs font-bold text-path-dark">{t('review.jetty', { n: returning[id] })}</span>}
                </span>
                {id === here ? (
                  <span className="flex items-center gap-1 text-sm font-bold text-grass-dark">
                    <MapPin size={16} aria-hidden /> {t('jetty.here')}
                  </span>
                ) : PLACES[id].built ? (
                  <Button onClick={() => sail(id)} aria-label={t('jetty.sailTo', { place: name })}>
                    <Sailboat size={18} aria-hidden /> {t('jetty.sail')}
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-sm font-bold text-wood-dark/70">
                    <Clock size={16} aria-hidden /> {t('jetty.comingSoon')}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
