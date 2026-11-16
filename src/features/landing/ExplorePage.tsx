import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Castle,
  Cpu,
  Crown,
  FlaskConical,
  GraduationCap,
  House,
  Landmark,
  Mountain,
  PawPrint,
  Shield,
  Swords,
  Trees,
  type LucideIcon,
} from 'lucide-react'
import { buttonClasses } from '../../components/ui'
import { LanguagePicker } from '../../i18n/LanguagePicker'
import { SceneBackdrop } from './SceneBackdrop'
import { REGIONS, type RegionId } from './regions'
import './landing.css'

const ICONS: Record<RegionId, LucideIcon> = {
  greenhaven: House,
  knowledge_forest: Trees,
  mathematics_mountains: Mountain,
  science_island: FlaskConical,
  language_kingdom: Crown,
  history_ruins: Landmark,
  technology_city: Cpu,
  university_district: GraduationCap,
  monster_wilderness: PawPrint,
  clan_territory: Shield,
  ancient_dungeon: Castle,
  world_boss_arena: Swords,
}

export function ExplorePage() {
  const { t } = useTranslation()
  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto max-w-6xl px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/welcome" className={buttonClasses('secondary', 'md')}>
            <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden /> {t('common.back')}
          </Link>
          <LanguagePicker />
        </header>

        <h1 className="title-outline mt-6 bg-gradient-to-b from-[#fff1a8] via-gold to-[#ef9b2f] bg-clip-text text-center font-display text-[clamp(2rem,7vw,3.5rem)] font-bold text-transparent">
          {t('explore.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl rounded-xl bg-cream/80 px-4 py-2 text-center font-semibold">{t('explore.intro')}</p>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REGIONS.map((r, i) => {
            const Icon = ICONS[r.id]
            const first = r.id === 'greenhaven'
            return (
              <li
                key={r.id}
                className={`rise-in overflow-hidden rounded-3xl border-4 bg-cream shadow-[0_6px_0_rgb(92_58_36/0.35)] ${first ? 'border-grass-dark' : 'border-wood'}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative grid h-28 place-items-center" style={{ background: `linear-gradient(160deg, ${r.colour}, color-mix(in srgb, ${r.colour} 55%, #3b2a1e))` }}>
                  <Icon size={56} strokeWidth={1.6} className="text-cream drop-shadow-[0_3px_0_rgb(0_0_0/0.25)]" aria-hidden />
                  {first && (
                    <span className="absolute top-2 start-2 rounded-full border-2 border-wood-dark bg-gold px-3 py-0.5 font-display text-sm font-semibold text-ink">
                      {t('explore.firstStop')}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-semibold text-wood-dark">{t(`regions.${r.id}.name`)}</h2>
                  <p className="mt-1 text-sm text-ink/80">{t(`regions.${r.id}.blurb`)}</p>
                  {'open' in r ? (
                    <p className="mt-3 inline-block rounded-full border-2 border-grass-dark bg-grass/30 px-3 py-0.5 text-xs font-bold text-ink">{t('explore.openNow')}</p>
                  ) : (
                    <p className="mt-3 inline-block rounded-full border-2 border-wood/50 px-3 py-0.5 text-xs font-bold text-wood-dark">{t('explore.opensIn', { phase: r.phase })}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
