import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { isUnlocked, TITLES } from '../../game/unlocks'

export const titleKey = (uid: string | undefined) => ['title', uid]

/** The title the player chose (the server checks the level when it is set). */
export function useMyTitle(uid: string | undefined) {
  return useQuery({
    queryKey: titleKey(uid),
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_title')
      if (error) throw error
      return (data as string | null) ?? null
    },
  })
}

/** Lists every title; ones above the player's level are shown but cannot be picked. */
export function TitlePicker({ uid, level, current, onPick }: { uid: string; level: number; current: string | null; onPick?: (key: string | null) => Promise<void> }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [error, setError] = useState(false)
  const pick =
    onPick ??
    (async (key: string | null) => {
      const { error: e } = await supabase!.rpc('set_title', { p_key: key })
      if (e) throw e
    })

  async function change(value: string) {
    setError(false)
    try {
      await pick(value || null)
      await queryClient.invalidateQueries({ queryKey: titleKey(uid) })
    } catch {
      setError(true)
    }
  }

  return (
    <label className="flex w-full flex-col gap-1 text-sm font-bold text-wood-dark">
      {t('titles.label')}
      <select value={current ?? ''} onChange={(e) => void change(e.target.value)} className="min-h-11 rounded-xl border-[3px] border-wood/60 bg-white px-2 font-semibold text-ink">
        <option value="">{t('titles.none')}</option>
        {TITLES.map((u) => (
          <option key={u.key} value={u.key} disabled={!isUnlocked(level, 'title', u.key)}>
            {isUnlocked(level, 'title', u.key) ? t(`titles.${u.key}`) : t('titles.locked', { title: t(`titles.${u.key}`), level: u.level })}
          </option>
        ))}
      </select>
      {error && <span role="alert" className="text-danger">{t('shop.errors.failed')}</span>}
    </label>
  )
}
