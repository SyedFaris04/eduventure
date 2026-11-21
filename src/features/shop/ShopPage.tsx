import { playSfx } from '../../audio/engine'
import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Coins, Lock, ShoppingBag, Shirt } from 'lucide-react'
import { Button, buttonClasses, Paged, Panel } from '../../components/ui'
import { useShortScreen } from '../../app/useShortScreen'
import { useFestivals } from '../festival/festivalApi'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { FormMessage } from '../authentication/AuthLayout'
import { useSession } from '../authentication/useSession'
import { Snapshot } from '../../world3d/SnapshotImage'
import type { Appearance } from '../character/appearance'
import { saveCharacter, useMyCharacter, useProgression } from '../character/useCharacter'
import { isUnlocked, unlockLevel } from '../../game/unlocks'
import { HERO_ITEMS, type Rarity, type ShopItem } from './catalogue'
import { buyItem, ownedItemsKey, useOwnedItems } from './useShop'
import { PetCorner, petSlot } from './PetCorner'
import { dressPet, petKey, usePet } from '../pet/usePet'
import { FestivalStall } from '../festival/FestivalStall'

const RARITY_STYLE: Record<Rarity, string> = {
  common: 'bg-grass/30 text-ink',
  rare: 'bg-water/50 text-ink',
  epic: 'bg-[#c9b6f2] text-ink',
}

export function ShopPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const uid = session?.user.id
  const character = useMyCharacter(uid)
  const progression = useProgression(uid)
  const owned = useOwnedItems(uid)
  const pet = usePet(uid)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const gold = progression.data?.gold ?? 0
  const short = useShortScreen()
  const festivalOn = Boolean(useFestivals(uid).data?.festivals.length)
  // Phones held sideways show one section at a time: hero items, the pet corner, the festival stall.
  const [section, setSection] = useState<'hero' | 'pet' | 'festival'>('hero')
  const show = (s: 'hero' | 'pet' | 'festival') => !short || section === s
  const look = character.data?.appearance

  async function buy(item: ShopItem) {
    setBusy(item.id)
    setMessage(null)
    try {
      await buyItem(item.id)
      playSfx('buy')
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['progression', uid] }), queryClient.invalidateQueries({ queryKey: ownedItemsKey(uid) })])
      setMessage({ kind: 'success', text: t('shop.bought', { item: t(`character.opt.${item.id}`) }) })
    } catch (e) {
      const m = (e as { message?: string }).message ?? ''
      setMessage({ kind: 'error', text: t(/not enough gold/i.test(m) ? 'shop.errors.gold' : /already own/i.test(m) ? 'shop.errors.owned' : /reach level/i.test(m) ? 'shop.errors.level' : 'shop.errors.failed') })
    } finally {
      setBusy(null)
    }
  }

  async function dressUp(item: ShopItem) {
    setBusy(item.id)
    setMessage(null)
    try {
      await dressPet(petSlot(item), item.id)
      await queryClient.invalidateQueries({ queryKey: petKey(uid) })
    } catch {
      setMessage({ kind: 'error', text: t('shop.errors.failed') })
    } finally {
      setBusy(null)
    }
  }

  async function wear(item: ShopItem) {
    if (!uid || !character.data) return
    setBusy(item.id)
    setMessage(null)
    try {
      await saveCharacter(uid, character.data.name, { ...character.data.appearance, [item.slot]: item.id } as Appearance)
      await queryClient.invalidateQueries({ queryKey: ['character', uid] })
    } catch {
      setMessage({ kind: 'error', text: t('shop.errors.failed') })
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 short:gap-2 short:py-1.5">
        <header className="flex flex-wrap items-center gap-3">
          <Link to="/home" aria-label={t('common.back')} className={buttonClasses('secondary', 'md', 'px-3!')}>
            <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden />
          </Link>
          <h1 className="flex items-center gap-2 rounded-full bg-cream/90 px-4 py-1 text-2xl font-bold text-wood-dark short:py-0.5 short:text-lg">
            <ShoppingBag aria-hidden /> {t('shop.title')}
          </h1>
          {short && (
            <div role="tablist" aria-label={t('shop.title')} className="flex gap-1">
              {(['hero', 'pet', ...(festivalOn ? ['festival' as const] : [])] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={section === s}
                  onClick={() => setSection(s)}
                  className={`rounded-xl border-2 px-2.5 py-1 font-display text-sm font-semibold ${section === s ? 'border-wood-dark bg-wood text-cream' : 'border-wood/40 bg-cream/90 text-wood-dark'}`}
                >
                  {t(s === 'hero' ? 'shop.heroItems' : s === 'pet' ? 'shop.petCorner' : 'festival.stall')}
                </button>
              ))}
            </div>
          )}
          <p className="ms-auto flex items-center gap-2 rounded-full bg-cream/90 px-4 py-1 font-display text-xl font-bold text-wood-dark short:py-0.5 short:text-base" aria-live="polite">
            <Coins className="text-gold" aria-hidden /> {t('shop.yourGold', { n: gold })}
          </p>
        </header>

        {show('festival') && <FestivalStall />}
        <p className="rounded-xl bg-cream/85 px-4 py-2 text-sm font-semibold text-wood-dark short:hidden">{t('shop.intro')}</p>
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}

        {show('hero') && (
        <Panel>
          <Paged list items={HERO_ITEMS} perPage={short ? 4 : Infinity} label={t('shop.heroItems')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 short:grid-cols-4 short:gap-2">
            {(item) => {
              const mine = owned.data?.has(item.id) ?? false
              const wearing = look?.[item.slot] === item.id
              const short = item.price - gold
              const lockedAt = isUnlocked(progression.data?.level ?? 1, 'shop_tier', item.rarity) ? null : unlockLevel('shop_tier', item.rarity)
              const name = t(`character.opt.${item.id}`)
              return (
                <li key={item.id} className="flex flex-col items-center gap-2 rounded-2xl border-[3px] border-wood/40 bg-white/85 p-3 short:gap-0.5 short:p-1.5" data-testid={`item-${item.id}`}>
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${RARITY_STYLE[item.rarity]}`}>{t(`shop.rarity.${item.rarity}`)}</span>
                    <span className="flex items-center gap-1 font-display font-bold text-wood-dark">
                      <Coins size={16} className="text-gold" aria-hidden /> {item.price}
                    </span>
                  </div>
                  {look && <Snapshot subject={{ kind: 'hero', appearance: { ...look, [item.slot]: item.id } as Appearance }} px={120} alt={t('shop.previewAlt', { item: name })} className="w-[120px] short:w-16 tiny:w-12" />}
                  <p className="text-center font-display text-lg leading-tight font-semibold short:text-sm">{name}</p>
                  {wearing ? (
                    <p className="flex min-h-11 items-center gap-1 font-bold text-grass-dark">
                      <Check size={18} aria-hidden /> {t('shop.wearing')}
                    </p>
                  ) : mine ? (
                    <Button variant="secondary" onClick={() => wear(item)} disabled={busy !== null} aria-label={t('shop.wearItem', { item: name })}>
                      <Shirt size={18} aria-hidden /> {t('shop.wear')}
                    </Button>
                  ) : lockedAt ? (
                    <p className="flex min-h-11 items-center gap-1 font-bold text-wood-dark/80" data-locked>
                      <Lock size={18} aria-hidden /> {t('shop.lockedLevel', { level: lockedAt })}
                    </p>
                  ) : (
                    <>
                      <Button onClick={() => buy(item)} disabled={busy !== null || short > 0} aria-label={t('shop.buyItem', { item: name })}>
                        <ShoppingBag size={18} aria-hidden /> {t('shop.buy')}
                      </Button>
                      {short > 0 && <p className="text-xs font-semibold text-wood-dark short:text-[11px] tiny:hidden">{t('shop.needMore', { n: short })}</p>}
                    </>
                  )}
                </li>
              )
            }}
          </Paged>
        </Panel>
        )}

        {show('pet') && (
        <PetCorner
          perPage={short ? 4 : Infinity}
          pet={pet.data}
          owned={owned.data ?? new Set()}
          level={progression.data?.level ?? 1}
          gold={gold}
          busy={busy !== null}
          onBuy={buy}
          onWear={dressUp}
        />
        )}
      </div>
    </main>
  )
}
