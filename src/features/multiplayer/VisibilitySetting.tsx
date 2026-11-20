import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '../authentication/useSession'
import { setVisible, useMyVisibility, visibilityKey } from './multiplayerApi'

/** "Let other players see me". Locked, with the reason, when a parent, a pending approval or a moderator decides. */
export function VisibilitySetting() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const uid = useSession().session?.user.id
  const v = useMyVisibility(uid).data
  const [busy, setBusy] = useState(false)
  if (!uid || !v) return null
  const locked = v.reason !== null && v.reason !== 'off'

  async function toggle(on: boolean) {
    setBusy(true)
    try {
      await setVisible(uid!, on)
      await queryClient.invalidateQueries({ queryKey: visibilityKey(uid) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={v.reason === null} disabled={locked || busy} onChange={(e) => void toggle(e.target.checked)} className="size-5 accent-grass-dark" />
        {t('multiplayer.letSee')}
      </label>
      {v.reason && <p className="text-xs font-semibold text-wood-dark/80">{t(`multiplayer.hidden.${v.reason}`)}</p>}
    </div>
  )
}
