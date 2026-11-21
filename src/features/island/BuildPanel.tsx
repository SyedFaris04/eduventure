import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Hammer, Lock, Move, RotateCw, Trash2 } from 'lucide-react'
import { buttonClasses } from '../../components/ui/Button'
import { useGame } from '../../game/store'
import type { Material } from '../../game/map'
import { Snapshot } from '../../world3d/SnapshotImage'
import { useSession } from '../authentication/useSession'
import { useProgression } from '../character/useCharacter'
import { materialsKey, useMaterials, type Materials, type MyMaterials } from '../harvest/harvestApi'
import { MATERIAL_ICON } from '../harvest/materialIcons'
import { IslandError, islandKey, moveItem, placeItem, removeItem, useIslandItems } from './islandApi'
import { CATEGORIES, centredAt, fits, footprint, ITEM, ITEMS, type Category, type Placed } from './rules'

const CLOSED = { open: false, item: null, rot: 0, mode: 'place' as const, moving: null }

/** The item covering a tile, if any. */
const itemAt = (items: Placed[], x: number, y: number) => items.find((p) => ITEM[p.item] && footprint(ITEM[p.item], p.x, p.y, p.rot).includes(`${x},${y}`))

/**
 * Build mode on My island: pick an item, tap the island to place it (turned with Turn), or Move / Remove what is there.
 * The server checks every placement; this predicts with the same rules so a red ghost never costs anything.
 */
export function BuildPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const uid = useSession().session?.user.id
  const build = useGame((s) => s.build)
  const tapReq = useGame((s) => s.buildTap)
  const items = useIslandItems(uid).data ?? []
  const level = useProgression(uid).data?.level ?? 1
  const materials = useMaterials(uid).data?.materials
  const [tab, setTab] = useState<Category>('house')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const busy = useRef(false)
  const seen = useRef(useGame.getState().buildTap?.seq)
  const set = (patch: Partial<typeof build>) => useGame.setState((s) => ({ build: { ...s.build, ...patch } }))

  // Leaving the island (or the world) closes build mode.
  useEffect(() => () => useGame.setState({ build: CLOSED, buildTap: null, buildHover: null }), [])

  const say = (key: string, ok: boolean, opts: Record<string, unknown> = {}) => setMessage({ text: t(key, opts), ok })
  const fail = (e: unknown) => say(e instanceof IslandError ? e.message : 'island.generic', false, { n: e instanceof IslandError ? e.level : undefined })
  const setItems = (f: (list: Placed[]) => Placed[]) => queryClient.setQueryData(islandKey(uid), (list: Placed[] | undefined) => f(list ?? []))
  const setMaterials = (m: Materials) => queryClient.setQueryData(materialsKey(uid), (old: MyMaterials | undefined) => ({ tools: old?.tools ?? [], materials: m }))

  useEffect(() => {
    if (!tapReq || tapReq.seq === seen.current) return
    seen.current = tapReq.seq
    const b = useGame.getState().build
    if (!b.open || busy.current) return
    const run = async (work: () => Promise<void>) => {
      busy.current = true
      try {
        await work()
      } catch (e) {
        fail(e)
      } finally {
        busy.current = false
      }
    }
    if (b.mode === 'remove') {
      const hit = itemAt(items, tapReq.x, tapReq.y)
      if (!hit) return
      void run(async () => {
        const r = await removeItem(hit.id)
        setItems((list) => list.filter((p) => p.id !== hit.id))
        setMaterials(r.materials)
        say('island.removed', true)
      })
      return
    }
    if (b.mode === 'move' && b.moving === null) {
      const hit = itemAt(items, tapReq.x, tapReq.y)
      if (hit) set({ moving: hit.id, rot: hit.rot })
      return
    }
    const id = b.mode === 'move' ? items.find((p) => p.id === b.moving)?.item : b.item
    if (!id) return
    const at = centredAt(ITEM[id], tapReq.x, tapReq.y, b.rot)
    if (!fits(items, id, at.x, at.y, b.rot, b.mode === 'move' ? (b.moving ?? undefined) : undefined)) {
      say('island.notFit', false)
      return
    }
    if (b.mode === 'move') {
      const movingId = b.moving!
      void run(async () => {
        const r = await moveItem(movingId, at.x, at.y, b.rot)
        setItems((list) => list.map((p) => (p.id === movingId ? r.item : p)))
        set({ moving: null })
        say('island.moved', true)
      })
      return
    }
    void run(async () => {
      const r = await placeItem(id, at.x, at.y, b.rot)
      setItems((list) => [...list, r.item])
      setMaterials(r.materials)
      say('island.placed', true)
    })
    // Each tap (its seq) is handled once.
  }, [tapReq?.seq]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!build.open)
    return (
      <button type="button" onClick={() => useGame.setState({ build: { ...CLOSED, open: true } })} className={buttonClasses('primary', 'md', 'pointer-events-auto absolute end-5 bottom-24 z-20')}>
        <Hammer size={20} aria-hidden /> {t('island.build')}
      </button>
    )

  const hint = build.mode === 'remove' ? 'island.removeHint' : build.mode === 'move' ? 'island.moveHint' : 'island.pick'
  const tool = (mode: 'move' | 'remove', Icon: typeof Move, label: string) => (
    <button type="button" aria-pressed={build.mode === mode} onClick={() => set({ mode: build.mode === mode ? 'place' : mode, item: null, moving: null })} className={buttonClasses(build.mode === mode ? 'primary' : 'secondary', 'md', 'short:min-h-9 px-3!')}>
      <Icon size={18} aria-hidden /> {label}
    </button>
  )

  return (
    <section aria-label={t('island.build')} className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 flex max-h-[55%] flex-col gap-1.5 rounded-2xl border-[3px] border-wood bg-cream/95 p-2 shadow-[0_4px_0_var(--color-wood-dark)]">
      <div role="tablist" className="flex gap-1 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button key={c} role="tab" type="button" aria-selected={tab === c} onClick={() => setTab(c)} className={`shrink-0 rounded-full border-2 px-3 py-0.5 text-sm font-bold whitespace-nowrap ${tab === c ? 'border-wood-dark bg-gold' : 'border-wood/40 bg-white'}`}>
            {t(`island.category.${c}`)}
          </button>
        ))}
      </div>
      <ul className="flex min-h-0 gap-1.5 overflow-x-auto pb-1">
        {ITEMS.filter((i) => i.category === tab).map((i) => {
          const locked = i.level > level
          const chosen = build.mode === 'place' && build.item === i.id
          return (
            <li key={i.id} className="shrink-0">
              <button
                type="button"
                disabled={locked}
                aria-pressed={chosen}
                onClick={() => set({ item: i.id, mode: 'place', moving: null })}
                className={`flex w-24 flex-col items-center rounded-xl border-[3px] p-1 text-center disabled:opacity-60 ${chosen ? 'border-wood-dark bg-gold/50' : 'border-wood/30 bg-white'}`}
              >
                <Snapshot subject={{ kind: 'islandItem', id: i.id }} px={88} alt="" className="size-11" />
                <span className="line-clamp-1 text-xs font-bold">{t(`island.item.${i.id}`)}</span>
                {locked ? (
                  <span className="flex items-center gap-0.5 text-[11px] font-bold text-wood-dark">
                    <Lock size={11} aria-hidden /> {t('island.level', { n: i.level })}
                  </span>
                ) : (
                  <span className="flex flex-wrap justify-center gap-1 text-[11px] font-bold">
                    {(Object.entries(i.cost) as [Material, number][]).map(([m, n]) => {
                      const Icon = MATERIAL_ICON[m]
                      return (
                        <span key={m} className={`flex items-center ${(materials?.[m] ?? 0) < n ? 'text-danger' : 'text-wood-dark'}`}>
                          <Icon size={11} aria-hidden /> {n}
                          <span className="sr-only">{t(`harvest.material.${m}`)}</span>
                        </span>
                      )
                    })}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => set({ rot: (build.rot + 1) % 4 })} className={buttonClasses('secondary', 'md', 'short:min-h-9 px-3!')}>
          <RotateCw size={18} aria-hidden /> {t('island.turn')}
        </button>
        {tool('move', Move, t('island.move'))}
        {tool('remove', Trash2, t('island.remove'))}
        <p role="status" className={`min-w-0 flex-1 truncate text-xs font-semibold ${message ? (message.ok ? 'text-grass-dark' : 'text-danger') : 'text-wood-dark'}`}>
          {message ? message.text : t(hint)}
        </p>
        <button type="button" onClick={() => useGame.setState({ build: CLOSED, buildHover: null })} className={buttonClasses('primary', 'md', 'short:min-h-9 px-3!')}>
          <Check size={18} aria-hidden /> {t('island.done')}
        </button>
      </div>
    </section>
  )
}
