import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Coins, ShoppingBag, Shirt } from 'lucide-react'
import { Button, buttonClasses, Panel } from '../../components/ui'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { FormMessage } from '../authentication/AuthLayout'
import { useSession } from '../authentication/useSession'
import { Snapshot } from '../../world3d/SnapshotImage'
import type { Appearance } from '../character/appearance'
import { saveCharacter, useMyCharacter, useProgression } from '../character/useCharacter'
import { CATALOGUE, type Rarity, type ShopItem } from './catalogue'
import { buyItem, ownedItemsKey, useOwnedItems } from './useShop'

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
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const gold = progression.data?.gold ?? 0
  const look = character.data?.appearance

  async function buy(item: ShopItem) {
    setBusy(item.id)
    setMessage(null)
    try {
      await buyItem(item.id)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['progression', uid] }), queryClient.invalidateQueries({ queryKey: ownedItemsKey(uid) })])
      setMessage({ kind: 'success', text: t('shop.bought', { item: t(`character.opt.${item.id}`) }) })
    } catch (e) {
      const m = (e as { message?: string }).message ?? ''
      setMessage({ kind: 'error', text: t(/not enough gold/i.test(m) ? 'shop.errors.gold' : /already own/i.test(m) ? 'shop.errors.owned' : 'shop.errors.failed') })
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
      <div className="relative mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">
        <header className="flex flex-wrap items-center gap-3">
          <Link to="/home" aria-label={t('common.back')} className={buttonClasses('secondary', 'md', 'px-3!')}>
            <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden />
          </Link>
          <h1 className="flex items-center gap-2 rounded-full bg-cream/90 px-4 py-1 text-2xl font-bold text-wood-dark">
            <ShoppingBag aria-hidden /> {t('shop.title')}
          </h1>
          <p className="ms-auto flex items-center gap-2 rounded-full bg-cream/90 px-4 py-1 font-display text-xl font-bold text-wood-dark" aria-live="polite">
            <Coins className="text-gold" aria-hidden /> {t('shop.yourGold', { n: gold })}
          </p>
        </header>

        <p className="rounded-xl bg-cream/85 px-4 py-2 text-sm font-semibold text-wood-dark">{t('shop.intro')}</p>
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}

        <Panel>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOGUE.map((item) => {
              const mine = owned.data?.has(item.id) ?? false
              const wearing = look?.[item.slot] === item.id
              const short = item.price - gold
              const name = t(`character.opt.${item.id}`)
              return (
                <li key={item.id} className="flex flex-col items-center gap-2 rounded-2xl border-[3px] border-wood/40 bg-white/85 p-3" data-testid={`item-${item.id}`}>
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${RARITY_STYLE[item.rarity]}`}>{t(`shop.rarity.${item.rarity}`)}</span>
                    <span className="flex items-center gap-1 font-display font-bold text-wood-dark">
                      <Coins size={16} className="text-gold" aria-hidden /> {item.price}
                    </span>
                  </div>
                  {look && <Snapshot subject={{ kind: 'hero', appearance: { ...look, [item.slot]: item.id } as Appearance }} px={120} alt={t('shop.previewAlt', { item: name })} className="w-[120px]" />}
                  <p className="font-display text-lg font-semibold">{name}</p>
                  {wearing ? (
                    <p className="flex min-h-11 items-center gap-1 font-bold text-grass-dark">
                      <Check size={18} aria-hidden /> {t('shop.wearing')}
                    </p>
                  ) : mine ? (
                    <Button variant="secondary" onClick={() => wear(item)} disabled={busy !== null} aria-label={t('shop.wearItem', { item: name })}>
                      <Shirt size={18} aria-hidden /> {t('shop.wear')}
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => buy(item)} disabled={busy !== null || short > 0} aria-label={t('shop.buyItem', { item: name })}>
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
      </div>
    </main>
  )
}
