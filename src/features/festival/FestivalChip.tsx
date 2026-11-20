import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Star } from 'lucide-react'
import { useSession } from '../authentication/useSession'
import { useFestivals } from './festivalApi'

/** Under the player card while a festival is on: its name and the player's tokens. Calm, no countdown. Opens the stall. */
export function FestivalChip() {
  const { t } = useTranslation()
  const data = useFestivals(useSession().session?.user.id).data
  if (!data?.festivals.length) return null
  const names = data.festivals.map((f) => t(`festival.name.${f.kind}`)).join(' · ')
  return (
    <Link
      to="/shop#festival"
      aria-label={t('festival.chipLabel', { names, n: data.tokens })}
      className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-gold bg-cream/95 px-3 py-1 text-xs font-bold text-wood-dark"
    >
      <Star size={14} className="text-gold" aria-hidden />
      <span>{names}</span>
      <span className="rounded-full bg-gold/40 px-1.5">{data.tokens}</span>
    </Link>
  )
}
