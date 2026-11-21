import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Hammer } from 'lucide-react'
import { Button } from '../../components/ui'
import { useGame } from '../../game/store'
import { usePlace } from '../../game/placeStore'
import type { Material } from '../../game/map'
import { playSfx } from '../../audio/engine'
import { useSession } from '../authentication/useSession'
import { ownedItemsKey, useOwnedItems } from '../shop/useShop'
import { campKey, contribute, craft, HarvestError, materialsKey, useCamp, useMaterials, useRecipes, type MyMaterials, type Recipe } from './harvestApi'
import { MATERIAL_ICON } from './materialIcons'
import { canAfford, giveAmount, type Cost } from './craftRules'

type Tab = 'tools' | 'items' | 'camp'

export function CraftPanel() {
  return useGame((s) => s.workbench) ? <Workbench /> : null
}

function CostChips({ cost, have }: { cost: Cost; have?: Record<Material, number> }) {
  const { t } = useTranslation()
  return (
    <span className="flex flex-wrap gap-1.5">
      {Object.entries(cost).map(([m, n]) => {
        const Icon = MATERIAL_ICON[m as Material]
        const short = (have?.[m as Material] ?? 0) < (n ?? 0)
        return (
          <span key={m} className={`flex items-center gap-1 rounded-full border-2 px-2 text-xs font-bold ${short ? 'border-danger/60 text-danger' : 'border-wood/40 text-wood-dark'}`}>
            <Icon size={12} aria-hidden /> {n} <span className="sr-only">{t(`harvest.material.${m}`)}</span>
          </span>
        )
      })}
    </span>
  )
}

/** The camp workbench: craft tools and items from harvested materials, and build the island camp together. */
function Workbench() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const uid = useSession().session?.user.id
  const place = usePlace((s) => s.place)
  const mine = useMaterials(uid).data
  const recipes = useRecipes().data ?? []
  const camp = useCamp(place).data ?? []
  const owned = useOwnedItems(uid).data
  const [tab, setTab] = useState<Tab>('tools')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const has = (r: Recipe) => (r.kind === 'tool' ? mine?.tools.includes(r.id as never) : owned?.has(r.id)) ?? false
  const name = (r: Recipe) => t(r.kind === 'tool' ? `craft.tool.${r.id}` : `character.opt.${r.id}`)

  async function run<T>(work: () => Promise<T>, done: (r: T) => string) {
    setBusy(true)
    setMessage(null)
    try {
      const r = await work()
      setMessage({ ok: true, text: done(r) })
      playSfx('mission')
    } catch (e) {
      setMessage({ ok: false, text: t(e instanceof HarvestError ? e.message : 'battle.errors.generic') })
      // Someone else may have finished a project or the numbers moved: show the latest.
      for (const k of [campKey(place), materialsKey(uid)]) void queryClient.invalidateQueries({ queryKey: k })
    } finally {
      setBusy(false)
    }
  }

  const doCraft = (r: Recipe) =>
    run(
      () => craft(r.id),
      (m) => {
        queryClient.setQueryData(materialsKey(uid), m)
        if (r.kind === 'cosmetic') void queryClient.invalidateQueries({ queryKey: ownedItemsKey(uid) })
        return t(r.kind === 'tool' ? 'craft.madeTool' : 'craft.madeItem', { name: name(r) })
      },
    )

  const give = (project: string, material: Material, amount: number) =>
    run(
      () => contribute(place, project, material, amount),
      (r) => {
        queryClient.setQueryData(materialsKey(uid), (m: MyMaterials | undefined) => ({ tools: m?.tools ?? [], materials: r.materials }))
        queryClient.setQueryData(campKey(place), r.camp)
        return t('craft.thanks', { n: r.given, name: t(`harvest.material.${material}`) })
      },
    )

  const list = tab === 'camp' ? [] : recipes.filter((r) => r.kind === (tab === 'tools' ? 'tool' : 'cosmetic'))

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/45 p-3">
      <section role="dialog" aria-modal="true" aria-label={t('craft.title')} className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border-4 border-wood bg-cream shadow-[0_0_0_3px_var(--color-wood-dark),0_16px_40px_rgb(0_0_0/0.4)]">
        <header className="flex items-center gap-3 rounded-t-[20px] bg-gradient-to-b from-[#d9b38c] to-wood p-3 text-cream">
          <Hammer size={28} aria-hidden />
          <h2 className="font-display text-xl font-bold">{t('craft.title')}</h2>
        </header>
        <div role="tablist" className="flex gap-2 px-4 pt-3">
          {(['tools', 'items', 'camp'] as const).map((k) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full border-2 px-3 py-1 font-display font-bold ${tab === k ? 'border-wood-dark bg-gold' : 'border-wood/40 bg-cream'}`}>
              {t(`craft.tab.${k}`)}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {message && (
            <p role={message.ok ? 'status' : 'alert'} className={`rounded-xl border-2 p-2 text-sm font-semibold ${message.ok ? 'border-grass-dark bg-grass/20' : 'border-danger bg-danger/10'}`}>
              {message.text}
            </p>
          )}
          {list.map((r) => {
            const got = has(r)
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-wood/30 bg-white/60 p-2">
                <div className="min-w-0 space-y-1">
                  <p className="font-display font-bold">{name(r)}</p>
                  {r.kind === 'tool' && <p className="text-xs font-semibold text-wood-dark">{t(`craft.toolHelp.${r.id}`)}</p>}
                  <CostChips cost={r.cost} have={mine?.materials} />
                </div>
                {got ? (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-grass-dark">
                    <Check size={16} aria-hidden /> {t('craft.owned')}
                  </span>
                ) : (
                  <Button aria-label={t('craft.make', { name: name(r) })} disabled={busy || !canAfford(r.cost, mine?.materials)} onClick={() => void doCraft(r)}>
                    {t('craft.craft')}
                  </Button>
                )}
              </div>
            )
          })}
          {tab === 'camp' && <p className="text-sm font-semibold text-wood-dark">{t('craft.campHelp')}</p>}
          {tab === 'camp' &&
            camp.map((p) => (
              <div key={p.project} className="space-y-1 rounded-2xl border-2 border-wood/30 bg-white/60 p-2">
                <p className="flex items-center justify-between font-display font-bold">
                  {t(`craft.camp.${p.project}`)}
                  {p.built && (
                    <span className="flex items-center gap-1 text-sm text-grass-dark">
                      <Check size={16} aria-hidden /> {t('craft.built')}
                    </span>
                  )}
                </p>
                {!p.built &&
                  Object.entries(p.cost).map(([m, need]) => {
                    const material = m as Material
                    const given = p.given[material] ?? 0
                    const amount = giveAmount(mine?.materials[material] ?? 0, need ?? 0, given)
                    const Icon = MATERIAL_ICON[material]
                    return (
                      <div key={m} className="flex items-center justify-between gap-2 text-sm font-semibold">
                        <span className="flex items-center gap-1">
                          <Icon size={14} aria-hidden /> {t(`harvest.material.${m}`)} {given} / {need}
                        </span>
                        {amount > 0 && (
                          <Button variant="secondary" disabled={busy} onClick={() => void give(p.project, material, amount)}>
                            {t('craft.give', { n: amount, name: t(`harvest.material.${m}`) })}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                {p.mine > 0 && <p className="text-xs font-semibold text-path-dark">{t('craft.yours', { n: p.mine })}</p>}
              </div>
            ))}
        </div>
        <div className="flex justify-end border-t-2 border-wood/20 p-3">
          <Button onClick={() => useGame.setState({ workbench: false })}>{t('harvest.done')}</Button>
        </div>
      </section>
    </div>
  )
}
