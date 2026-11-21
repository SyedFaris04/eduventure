import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Gem, Leaf, Mountain, TreePine, type LucideIcon } from 'lucide-react'
import { Button } from '../../components/ui'
import { reactToAnswer, useGame } from '../../game/store'
import { usePlace } from '../../game/placeStore'
import type { Material } from '../../game/map'
import { playSfx } from '../../audio/engine'
import { useSession } from '../authentication/useSession'
import { MIN_READ_MS, MissionNotes } from '../battle/BattlePanel'
import { QuestionCard } from '../battle/QuestionCard'
import type { AnswerPayload } from '../battle/battleApi'
import type { PublicQuestion } from '../battle/questionSchema'
import { answerHarvest, cooldownsKey, HarvestError, materialsKey, startHarvest, type HarvestResult } from './harvestApi'

export const MATERIAL_ICON: Record<Material, LucideIcon> = { wood: TreePine, stone: Mountain, herbs: Leaf, crystal: Gem }

export function HarvestPanel() {
  const node = useGame((s) => s.harvest)
  if (!node) return null
  return <Harvest key={`${node.x},${node.y}`} x={node.x} y={node.y} material={node.material} />
}

/** One quick question per harvest: right gives 2, wrong gives 1 (plus any tool bonus). The server decides. */
function Harvest({ x, y, material }: { x: number; y: number; material: Material }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const uid = useSession().session?.user.id
  const place = usePlace((s) => s.place)
  const [question, setQuestion] = useState<PublicQuestion | null>(null)
  const [result, setResult] = useState<HarvestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const shownAt = useRef(0)
  const Icon = MATERIAL_ICON[material]

  useEffect(() => {
    let cancelled = false
    startHarvest(place, x, y)
      .then((s) => {
        if (cancelled) return
        setQuestion(s.question)
        shownAt.current = Date.now()
      })
      .catch((e) => !cancelled && setError(e instanceof HarvestError ? e.message : 'battle.errors.generic'))
    return () => {
      cancelled = true
    }
  }, [place, x, y])

  async function submit(answer: AnswerPayload) {
    if (busy || result) return
    setBusy(true)
    setError(null)
    const wait = MIN_READ_MS - (Date.now() - shownAt.current)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    try {
      const r = await answerHarvest(answer)
      setResult(r)
      queryClient.setQueryData(cooldownsKey(uid, place), (s: Set<string> | undefined) => new Set([...(s ?? []), `${x},${y}`]))
      queryClient.setQueryData(materialsKey(uid), (m: { tools: string[] } | undefined) => ({ tools: m?.tools ?? [], materials: r.materials }))
      playSfx(r.correct ? 'correct' : 'wrong')
      reactToAnswer(r.correct, false)
    } catch (e) {
      setError(e instanceof HarvestError ? e.message : 'battle.errors.generic')
    } finally {
      setBusy(false)
    }
  }

  function close() {
    for (const k of [cooldownsKey(uid, place), materialsKey(uid), ['missions', uid], ['mastery', uid], ['streak', uid]]) void queryClient.invalidateQueries({ queryKey: k })
    useGame.setState({ harvest: null })
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/45 p-3 short:p-1">
      <section role="dialog" aria-modal="true" aria-label={t(`harvest.action.${material}`)} className="w-full max-w-xl rounded-3xl border-4 border-wood bg-cream shadow-[0_0_0_3px_var(--color-wood-dark),0_16px_40px_rgb(0_0_0/0.4)] short:flex short:max-h-full short:max-w-3xl short:flex-col short:overflow-hidden">
        <header className="flex items-center gap-3 rounded-t-[20px] bg-gradient-to-b from-[#a6d672] to-grass p-3 short:py-1.5">
          <Icon size={32} className="shrink-0 text-wood-dark" aria-hidden />
          <div>
            <h2 className="font-display text-xl font-bold">{t(`harvest.action.${material}`)}</h2>
            <p className="text-sm font-semibold">{t('harvest.hint')}</p>
          </div>
        </header>
        <div className="space-y-4 p-4 short:min-h-0 short:flex-1 short:space-y-2 short:overflow-y-auto short:p-3">
          {error && (
            <p role="alert" className="rounded-xl border-2 border-danger bg-danger/10 p-2 text-sm font-semibold">
              {t(error)}
            </p>
          )}
          {!question && !error && <p className="font-display text-wood-dark">{t('common.loading')}</p>}
          {question && (
            <QuestionCard key={question.id} question={question} busy={busy} result={result} onSubmit={submit}>
              {result && (
                <p className="inline-flex items-center gap-2 rounded-full border-2 border-wood-dark bg-gold px-3 py-1 font-display font-bold">
                  <Icon size={18} aria-hidden /> {t('harvest.gained', { n: result.gained, name: t(`harvest.material.${result.material}`) })}
                </p>
              )}
              <MissionNotes ids={result?.missions_completed} />
            </QuestionCard>
          )}
          <div className="flex justify-end border-t-2 border-wood/20 pt-3">
            <Button onClick={close} disabled={busy}>
              {t('harvest.done')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
