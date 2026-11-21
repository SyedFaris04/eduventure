import { useTranslation } from 'react-i18next'
import type { Material } from '../../game/map'
import { useSession } from '../authentication/useSession'
import { useMaterials } from './harvestApi'
import { MATERIAL_ICON } from './materialIcons'

const ORDER: Material[] = ['wood', 'stone', 'herbs', 'crystal']

/** The player's materials, under the player card. Hidden until they have gathered something. */
export function MaterialsBar() {
  const { t } = useTranslation()
  const { data } = useMaterials(useSession().session?.user.id)
  if (!data || ORDER.every((m) => !data.materials[m])) return null
  return (
    <ul aria-label={t('harvest.materials')} className="pointer-events-auto flex gap-2 rounded-full border-2 border-wood bg-cream/95 px-3 py-1 text-xs font-bold text-wood-dark">
      {ORDER.map((m) => {
        const Icon = MATERIAL_ICON[m]
        return (
          <li key={m} className="flex items-center gap-1" title={t(`harvest.material.${m}`)}>
            <Icon size={14} aria-hidden />
            <span className="sr-only">{t(`harvest.material.${m}`)}</span> {data.materials[m]}
          </li>
        )
      })}
    </ul>
  )
}
