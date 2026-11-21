import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useGame } from '../../game/store'
import { usePlace } from '../../game/placeStore'
import { playSfx } from '../../audio/engine'
import { useSession } from '../authentication/useSession'
import { cooldownsKey, HarvestError, materialsKey, slashHarvest, type MyMaterials } from './harvestApi'
import { slashStep, START } from './slash'

/**
 * Harvesting by slashing (no question): each press near a node swings the hero; the third swing at the same node asks
 * the server for the materials. Shows "+2 Wood", or why not, for a moment above the action button.
 */
export function Slasher() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const uid = useSession().session?.user.id
  const place = usePlace((s) => s.place)
  const req = useGame((s) => s.slashReq)
  const toast = useGame((s) => s.harvestToast)
  const state = useRef(START)
  const busy = useRef(false)
  // A swing already in the store when the world opens belongs to an earlier visit: never replay it.
  const seen = useRef(useGame.getState().slashReq?.seq)
  useEffect(() => () => useGame.setState({ slashReq: null, harvestToast: null }), [])

  useEffect(() => {
    if (!req || req.seq === seen.current) return
    seen.current = req.seq
    const { state: next, done } = slashStep(state.current, `${req.x},${req.y}`, performance.now())
    state.current = next
    useGame.setState((s) => ({ slashSeq: s.slashSeq + 1 }))
    playSfx(req.material === 'wood' || req.material === 'herbs' ? 'chop' : 'clink')
    if (!done || busy.current) return
    busy.current = true
    const say = (text: string, ok: boolean) => useGame.setState((s) => ({ harvestToast: { text, ok, seq: (s.harvestToast?.seq ?? 0) + 1 } }))
    slashHarvest(place, req.x, req.y)
      .then((r) => {
        queryClient.setQueryData(materialsKey(uid), (m: MyMaterials | undefined) => ({ tools: m?.tools ?? [], materials: r.materials }))
        // Regrowing at once (the prompt goes), before the refetch confirms it.
        queryClient.setQueryData(cooldownsKey(uid, place), (s: Set<string> | undefined) => new Set([...(s ?? []), `${req.x},${req.y}`]))
        say(t('harvest.gained', { n: r.gained, name: t(`harvest.material.${r.material}`) }), true)
        playSfx('coin')
      })
      .catch((e) => say(t(e instanceof HarvestError ? e.message : 'battle.errors.generic'), false))
      .finally(() => {
        busy.current = false
        void queryClient.invalidateQueries({ queryKey: cooldownsKey(uid, place) })
      })
    // Each request (its seq) is one swing.
  }, [req?.seq]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => useGame.setState({ harvestToast: null }), 1800)
    return () => clearTimeout(id)
  }, [toast])

  if (!toast) return null
  return (
    <p role="status" className={`pointer-events-none absolute end-4 bottom-28 z-20 rounded-full border-[3px] px-4 py-1.5 font-display text-lg font-bold shadow-[0_4px_0_var(--color-wood-dark)] ${toast.ok ? 'border-wood-dark bg-gold text-ink' : 'border-danger bg-cream text-ink'}`}>
      {toast.text}
    </p>
  )
}
