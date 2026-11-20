import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Coins, Gift, Sparkles, Star } from 'lucide-react'
import { Button, Panel, ProgressBar } from '../../components/ui'
import { supabase } from '../../services/supabase'
import { festivalsKey } from '../festival/festivalApi'
import { untilLabel, type FestivalKind } from '../festival/festivalRules'
import { StreakBox, type Streak } from './StreakBox'

export type Mission = {
  id: string
  template_id: string
  period: 'daily' | 'weekly' | 'festival'
  subject: string | null
  progress: number
  target: number
  completed: boolean
  claimed: boolean
  xp: number
  gold: number
  festival: FestivalKind | null
  tokens: number
  ends_on: string | null
}

/** Keeps the server's idea of "today" in the player's own time zone. */
function useSyncTimezone(uid: string | undefined) {
  useEffect(() => {
    if (!uid || !supabase) return
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) void supabase.from('user_settings').update({ timezone: tz }).eq('user_id', uid).neq('timezone', tz)
  }, [uid])
}

export function MissionsPanel({ uid }: { uid: string }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useSyncTimezone(uid)

  const missions = useQuery({
    queryKey: ['missions', uid],
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_missions')
      if (error) throw error
      return data as Mission[]
    },
  })
  const streak = useQuery({
    queryKey: ['streak', uid],
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_streak')
      if (error) throw error
      return data as Streak
    },
  })

  async function toggleView(st: Streak) {
    await supabase!.from('user_settings').update({ streak_view: st.view === 'count' ? 'week' : 'count' }).eq('user_id', uid)
    await queryClient.invalidateQueries({ queryKey: ['streak', uid] })
  }

  async function claim(m: Mission) {
    setBusy(m.id)
    setError(null)
    const { data, error } = await supabase!.rpc('claim_mission', { p_id: m.id })
    setBusy(null)
    if (error) return setError(t('missions.claimFailed'))
    queryClient.setQueryData(['progression', uid], { xp: Number(data.totals.xp), level: data.totals.level, gold: Number(data.totals.gold) })
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['missions', uid] }), queryClient.invalidateQueries({ queryKey: festivalsKey(uid) })])
  }

  const title = (m: Mission) =>
    m.festival
      ? t(`missions.festival.${m.template_id.split('_').at(-1)}`, { festival: t(`festival.name.${m.festival}`), target: m.target })
      : t(`missions.${m.template_id}`, { target: m.target, subject: m.subject ? t(`battle.subject.${m.subject}`, { defaultValue: m.subject }) : t('missions.anySubject') })
  const normal = missions.data?.filter((m) => !m.festival) ?? []
  const festivals = [...new Set(missions.data?.flatMap((m) => (m.festival ? [m.festival] : [])))]

  const row = (m: Mission) => (
    <div key={m.id} className="rounded-xl border-2 border-wood/25 bg-white/80 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title(m)}</p>
        {m.completed && !m.claimed ? (
          <Button onClick={() => void claim(m)} disabled={busy === m.id} className="min-h-9! px-3! text-sm!">
            <Gift size={16} aria-hidden /> {t('missions.claim')}
          </Button>
        ) : (
          <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-wood-dark">
            {m.claimed ? (
              t('missions.claimed')
            ) : (
              <>
                {m.tokens > 0 && (
                  <>
                    <Star size={13} className="text-gold" aria-label={t('festival.tokenIcon')} /> <span>+{m.tokens}</span>
                  </>
                )}
                <Sparkles size={13} className="text-water-dark" aria-hidden /> {m.xp} <Coins size={13} className="text-path-dark" aria-hidden /> {m.gold}
              </>
            )}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <ProgressBar value={m.progress / m.target} label={title(m)} className="h-3.5! flex-1" />
        <span className="text-xs font-bold">
          {Math.min(m.progress, m.target)}/{m.target}
        </span>
      </div>
      {m.ends_on && <p className="mt-1 text-xs font-semibold text-wood-dark/80">{t('festival.until', { date: untilLabel(m.ends_on, i18n.language) })}</p>}
    </div>
  )
  const section = (id: string, heading: string, list: Mission[]) => (
    <section key={id} aria-labelledby={`missions-${id}`} className="flex flex-col gap-2">
      <h3 id={`missions-${id}`} className="font-display text-sm font-bold tracking-wide text-wood-dark uppercase">
        {heading}
      </h3>
      {list.map(row)}
    </section>
  )

  return (
    <Panel title={t('missions.title')} className="flex flex-col gap-3">
      {streak.data && <StreakBox streak={streak.data} onToggleView={() => void toggleView(streak.data!)} />}
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      {(['daily', 'weekly'] as const).map((period) => section(period, t(`missions.${period}`), normal.filter((m) => m.period === period)))}
      {festivals.map((f) => section(`festival-${f}`, t(`festival.name.${f}`), missions.data!.filter((m) => m.festival === f)))}
    </Panel>
  )
}
