import { useTranslation } from 'react-i18next'
import { Check, Coins, Lock, PawPrint, ShoppingBag } from 'lucide-react'
import { Button, Panel } from '../../components/ui'
import { Snapshot } from '../../world3d/SnapshotImage'
import { isUnlocked, unlockLevel } from '../../game/unlocks'
import type { Pet } from '../pet/petRules'
import { CATALOGUE, type ShopItem } from './catalogue'

export const PET_ITEMS = CATALOGUE.filter((i) => i.slot.startsWith('pet_') && !('craft' in i))
export const petSlot = (item: ShopItem) => item.slot.replace('pet_', '') as 'hat' | 'neck' | 'dye'

type Props = { pet: Pet | null | undefined; owned: Set<string>; level: number; gold: number; busy: boolean; onBuy: (item: ShopItem) => void; onWear: (item: ShopItem) => void }

/** The pet corner of the shop: fixed prices, no surprises, and the same level tiers as hero items. */
export function PetCorner({ pet, owned, level, gold, busy, onBuy, onWear }: Props) {
  const { t } = useTranslation()
  return (
    <Panel>
      <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-bold text-wood-dark">
        <PawPrint aria-hidden /> {t('shop.petCorner')}
      </h2>
      {!pet && <p className="mb-3 text-sm font-semibold text-wood-dark">{t('shop.hatchFirst')}</p>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PET_ITEMS.map((item) => {
          const mine = owned.has(item.id)
          const wearing = pet?.look[petSlot(item)] === item.id
          const short = item.price - gold
          const lockedAt = isUnlocked(level, 'shop_tier', item.rarity) ? null : unlockLevel('shop_tier', item.rarity)
          const name = t(`character.opt.${item.id}`)
          return (
            <li key={item.id} className="flex flex-col items-center gap-2 rounded-2xl border-[3px] border-wood/40 bg-white/85 p-3" data-testid={`item-${item.id}`}>
              <span className="flex items-center gap-1 self-end font-display font-bold text-wood-dark">
                <Coins size={16} className="text-gold" aria-hidden /> {item.price}
              </span>
              {pet && <Snapshot subject={{ kind: 'pet', pet: { ...pet, look: { ...pet.look, [petSlot(item)]: item.id } } }} px={100} alt={t('shop.previewAlt', { item: name })} className="w-[100px]" />}
              <p className="font-display text-lg font-semibold">{name}</p>
              {wearing ? (
                <p className="flex min-h-11 items-center gap-1 font-bold text-grass-dark">
                  <Check size={18} aria-hidden /> {t('shop.wearing')}
                </p>
              ) : mine ? (
                pet && (
                  <Button variant="secondary" onClick={() => onWear(item)} disabled={busy} aria-label={t('shop.wearItem', { item: name })}>
                    <PawPrint size={18} aria-hidden /> {t('shop.wear')}
                  </Button>
                )
              ) : lockedAt ? (
                <p className="flex min-h-11 items-center gap-1 font-bold text-wood-dark/80" data-locked>
                  <Lock size={18} aria-hidden /> {t('shop.lockedLevel', { level: lockedAt })}
                </p>
              ) : (
                <>
                  <Button onClick={() => onBuy(item)} disabled={busy || short > 0} aria-label={t('shop.buyItem', { item: name })}>
                    <ShoppingBag size={18} aria-hidden /> {t('shop.buy')}
                  </Button>
                  {short > 0 && <p className="text-xs font-semibold text-wood-dark">{t('shop.needMore', { n: short })}</p>}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
