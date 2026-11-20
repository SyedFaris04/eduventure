import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'
import { useRoom } from './useRoom'

/** A quiet note while the room server can't be reached; the game itself carries on as usual. */
export function RoomStatus() {
  const { t } = useTranslation()
  const solo = useRoom((s) => s.status === 'solo')
  if (!solo) return null
  return (
    <p role="status" className="flex items-center gap-1 rounded-full bg-cream/90 px-2.5 py-0.5 text-xs font-semibold text-wood-dark">
      <WifiOff size={12} aria-hidden /> {t('multiplayer.solo')}
    </p>
  )
}
