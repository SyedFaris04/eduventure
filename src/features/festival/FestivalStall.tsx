import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ShoppingBag, Star } from 'lucide-react'
import { Button, Panel } from '../../components/ui'
import { playSfx } from '../../audio/engine'
import { Snapshot } from '../../world3d/SnapshotImage'
import { FormMessage } from '../authentication/AuthLayout'
import { useSession } from '../authentication/useSession'
import type { Appearance } from '../character/appearance'
import { useMyCharacter } from '../character/useCharacter'
import { usePet } from '../pet/usePet'
import { petSlot } from '../shop/PetCorner'
import { ownedItemsKey, useOwnedItems } from '../shop/useShop'
import { buyFestivalItem, festivalErrorKey, festivalsKey, useFestivals } from './festivalApi'
import { FESTIVAL_ITEMS, untilLabel, type FestivalItem } from './festivalRules'

/** The festival stall: each festival's two items, for festival tokens, while that festival is on. Nothing when none is. */
export function FestivalStall() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const uid = useSession().session?.user.id
  const festivals = useFestivals(uid).data
  const owned = useOwnedItems(uid).data
  const look = useMyCharacter(uid).data?.appearance
  const pet = usePet(uid).data
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const on = Boolean(festivals?.festivals.length)
  // Opened from the world's festival chip (/shop#festival): bring the stall into view once it has appeared.
  useEffect(() => {
    if (on && window.location.hash === '#festival') document.getElementById('festival')?.scrollIntoView({ block: 'start' })
  }, [on])
  if (!festivals || !on) return null
  const tokens = festivals.tokens

  async function buy(item: FestivalItem) {
    setBusy(true)
    setMessage(null)
    try {
      await buyFestivalItem(item.id)
      playSfx('buy')
      await Promise.all([queryClient.invalidateQueries({ queryKey: festivalsKey(uid) }), queryClient.invalidateQueries({ queryKey: ownedItemsKey(uid) })])
      setMessage({ kind: 'success', text: t('shop.bought', { item: t(`character.opt.${item.id}`) }) })
    } catch (e) {
      setMessage({ kind: 'error', text: t(festivalErrorKey((e as { message?: string }).message)) })
    } finally {
      setBusy(false)
    }
  }

  const preview = (item: FestivalItem, name: string) => {
    if (item.slot.startsWith('pet_'))
      return pet && <Snapshot subject={{ kind: 'pet', pet: { ...pet, look: { ...pet.look, [petSlot(item)]: item.id } } }} px={100} alt={t('shop.previewAlt', { item: name })} className="w-[100px]" />
    return look && <Snapshot subject={{ kind: 'hero', appearance: { ...look, [item.slot]: item.id } as Appearance }} px={100} alt={t('shop.previewAlt', { item: name })} className="w-[100px]" />
  }

  return (
    <section id="festival" aria-label={t('festival.stall')}>
      <Panel className="border-gold!">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-wood-dark">
            <Star className="text-gold" aria-hidden /> {t('festival.stall')}
          </h2>
          <p className="ms-auto rounded-full bg-gold/30 px-3 py-0.5 font-display font-bold text-wood-dark" aria-live="polite">
            {t('festival.tokens', { n: tokens })}
          </p>
        </div>
        <p className="mb-3 text-sm font-semibold text-wood-dark">{t('festival.stallIntro')}</p>
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
        {festivals.festivals.map((f) => (
          <div key={f.id} className="mt-3">
            <h3 className="font-display text-lg font-bold text-wood-dark">
              {t(`festival.name.${f.kind}`)} <span className="text-sm font-semibold text-wood-dark/80">· {t('festival.until', { date: untilLabel(f.ends_on, i18n.language) })}</span>
            </h3>
            <ul className="mt-2 grid gap-4 sm:grid-cols-2">
              {FESTIVAL_ITEMS(f.kind).map((item) => {
                const name = t(`character.opt.${item.id}`)
                const short = item.tokens - tokens
                return (
                  <li key={item.id} className="flex flex-col items-center gap-2 rounded-2xl border-[3px] border-wood/40 bg-white/85 p-3" data-testid={`festival-item-${item.id}`}>
                    <span className="flex items-center gap-1 self-end font-display font-bold text-wood-dark">
                      <Star size={16} className="text-gold" aria-label={t('festival.tokenIcon')} /> {item.tokens}
                    </span>
                    {preview(item, name)}
                    <p className="font-display text-lg font-semibold">{name}</p>
                    {owned?.has(item.id) ? (
                      <p className="flex min-h-11 items-center gap-1 font-bold text-grass-dark">
                        <Check size={18} aria-hidden /> {t('festival.owned')}
                      </p>
                    ) : (
                      <>
                        <Button onClick={() => void buy(item)} disabled={busy || short > 0} aria-label={t('shop.buyItem', { item: name })}>
                          <ShoppingBag size={18} aria-hidden /> {t('shop.buy')}
                        </Button>
                        {short > 0 && <p className="text-xs font-semibold text-wood-dark">{t('festival.needMore', { n: short })}</p>}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </Panel>
    </section>
  )
}
