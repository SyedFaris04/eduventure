import { useTranslation } from 'react-i18next'
import { Eye, Flame, Moon, Shield, Trophy } from 'lucide-react'

export type Streak = {
  current: number
  best: number
  shields: number
  rest_available: boolean
  today_done: boolean
  /** Monday to Sunday of this week: played or not. */
  week: boolean[]
  month_days: number
  view: 'count' | 'week'
}

/** The learning streak, kindly: shields and the rest day protect it, and a broken streak is never shown as a zero. */
export function StreakBox({ streak: s, onToggleView }: { streak: Streak; onToggleView: () => void }) {
  const { t } = useTranslation()
  const played = s.week.filter(Boolean).length
  const message = s.current > 0 ? (s.view === 'count' ? t('missions.streak', { n: s.current }) : null) : s.month_days > 0 ? t('missions.monthComeback', { n: s.month_days }) : t('missions.streakNone')
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-path/25 px-3 py-2 text-sm font-semibold">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Flame size={18} className={s.current ? 'fill-danger text-danger' : 'text-wood'} aria-hidden />
        {message && <span>{message}</span>}
        {s.today_done && <span className="text-grass-dark">· {t('missions.streakToday')}</span>}
        {s.shields > 0 && (
          <span className="flex items-center gap-1 text-water-dark">
            · <Shield size={14} aria-hidden /> <span>{s.shields === 1 ? t('missions.shield') : t('missions.shields', { n: s.shields })}</span>
          </span>
        )}
        {s.rest_available && (
          <span className="flex items-center gap-1 text-ink/70">
            · <Moon size={14} aria-hidden /> <span>{t('missions.restReady')}</span>
          </span>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span role="img" aria-label={t('missions.weekLabel', { n: played })} className="flex gap-1">
          {s.week.map((day, i) => (
            <span key={i} className={`size-3 rounded-full border-2 border-wood-dark ${day ? 'bg-grass-dark' : 'bg-white/70'}`} />
          ))}
        </span>
        {s.view === 'count' && s.best > 0 && (
          <span className="flex items-center gap-1 text-ink/70">
            <Trophy size={14} aria-hidden /> <span>{t('missions.best', { n: s.best })}</span>
          </span>
        )}
        <button type="button" onClick={onToggleView} className="ms-auto flex items-center gap-1 text-xs font-bold text-water-dark underline">
          <Eye size={14} aria-hidden /> {s.view === 'count' ? t('missions.viewWeek') : t('missions.viewCount')}
        </button>
      </div>
    </div>
  )
}
