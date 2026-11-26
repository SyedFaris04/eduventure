import { MyPetCheer } from '../pet/PetCheer'
import { BattlePetGuess } from '../pet/BattlePetGuess'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Coins, Flag, Gift, Sparkles, Star, Unlock, Zap } from 'lucide-react'
import { Button } from '../../components/ui'
import { reactToAnswer, useGame } from '../../game/store'
import type { MonsterKind } from '../../game/map'
import { Snapshot } from '../../world3d/SnapshotImage'
import { newUnlocks } from '../../game/unlocks'
import { useSession } from '../authentication/useSession'
import { useProgression } from '../character/useCharacter'
import { playSfx } from '../../audio/engine'
import { FINISHER } from '../../world3d/finisher'
import { answerQuestion, askFifty, BattleError, fleeEncounter, startEncounter, type AnswerPayload, type AnswerResult, type EncounterState } from './battleApi'
import type { PublicQuestion } from './questionSchema'
import { HelperBar } from './HelperBar'
import { QuestionCard } from './QuestionCard'

export const MIN_READ_MS = 1600 // the server rejects answers sooner than 1.5 s after a question appears
const HIT_MS = 800 // how long the winning answer shows before the defeat cutscene
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export function BattlePanel() {
  const battle = useGame((s) => s.battle)
  if (!battle) return null
  return <Battle key={battle.monsterId} monsterId={battle.monsterId} kind={battle.monster} returning={Boolean(battle.returning)} />
}

/** The player's level as the server last reported it, and the level they had when this panel opened. */
export function usePlayerLevel() {
  const { session } = useSession()
  const progression = useProgression(session?.user.id)
  const data = progression.data
  const level = data?.level ?? 1
  const atStart = useRef<number | null>(null)
  if (atStart.current === null && data) atStart.current = level
  // A failed load counts as loaded (level 1), so panels never wait forever; the server still checks every gate.
  return { level, startLevel: atStart.current ?? level, loaded: Boolean(data) || progression.isError }
}

/** Shared after-answer refresh: HUD totals at once, missions and streak when the panel closes. */
export function useProgressRefresh() {
  const queryClient = useQueryClient()
  const { session } = useSession()
  const uid = session?.user.id
  return {
    setTotals: (totals: { xp: number; level: number; gold: number }) => queryClient.setQueryData(['progression', uid], { xp: Number(totals.xp), level: totals.level, gold: Number(totals.gold) }),
    refreshAll: () => Promise.all(['progression', 'missions', 'streak', 'library', 'mastery', 'returning'].map((k) => queryClient.invalidateQueries({ queryKey: [k, uid] }))),
  }
}

function Battle({ monsterId, kind, returning }: { monsterId: string; kind: MonsterKind; returning: boolean }) {
  const { t } = useTranslation()
  const { setTotals, refreshAll } = useProgressRefresh()
  const [enc, setEnc] = useState<EncounterState | null>(null)
  const [question, setQuestion] = useState<PublicQuestion | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [earned, setEarned] = useState({ xp: 0, gold: 0, leveledTo: 0 })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const shownAt = useRef(0)
  const guessShown = useRef<string | null>(null)
  const { level, startLevel } = usePlayerLevel()
  const cutscene = useGame((s) => s.finisher !== null)

  useEffect(() => {
    let cancelled = false
    startEncounter(kind, returning)
      .then((s) => {
        if (cancelled) return
        setEnc(s)
        setQuestion(s.question)
        shownAt.current = Date.now()
      })
      .catch((e) => !cancelled && setError(e instanceof BattleError ? e.key : 'battle.errors.generic'))
    return () => {
      cancelled = true
    }
  }, [kind])

  const monster = enc?.monster_id ?? kind
  const monsterName = t(`monsters.${monster}.name`)
  const finished = enc && enc.status !== 'active'

  async function submit(answer: AnswerPayload) {
    if (!enc || busy || result) return
    setBusy(true)
    setError(null)
    const wait = MIN_READ_MS - (Date.now() - shownAt.current)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    try {
      guessShown.current = enc.pet_guess ?? null
      const r = await answerQuestion(enc.encounter_id, answer)
      setResult(r)
      setEnc(r.state)
      setTotals(r.totals)
      setEarned((e) => ({ xp: e.xp + r.xp_gained, gold: e.gold + r.gold_gained, leveledTo: r.leveled_up ? r.totals.level : e.leveledTo }))
      playSfx(r.correct ? 'correct' : 'wrong')
      if (r.pet === 'taught') setTimeout(() => playSfx('chirp'), 500)
      const won = r.state.status === 'won'
      // The defeat cutscene (decision #53): the last answer shows for a moment, then the world takes the stage.
      const cut = won && !reducedMotion()
      reactToAnswer(r.correct, won && !cut)
      if (cut) setTimeout(() => useGame.setState({ finisher: { monsterId, name: monsterName, startedAt: performance.now() } }), HIT_MS)
      else if (won) useGame.setState((s) => ({ defeated: [...s.defeated, monsterId] }))
      if (won) setTimeout(() => playSfx('victory'), cut ? HIT_MS + FINISHER.bannerAt : 350)
      else if (r.state.status === 'lost') setTimeout(() => playSfx('defeat'), 350)
      const later = cut ? HIT_MS + FINISHER.duration : 900
      if (r.leveled_up) setTimeout(() => playSfx('levelup'), later)
      else if (r.missions_completed?.length) setTimeout(() => playSfx('mission'), later)
    } catch (e) {
      setError(e instanceof BattleError ? e.key : 'battle.errors.generic')
    } finally {
      setBusy(false)
    }
  }

  async function fifty() {
    if (!enc || busy) return
    setBusy(true)
    try {
      const r = await askFifty(enc.encounter_id)
      setEnc({ ...enc, helpers: { ...enc.helpers, fifty_used: true, hidden: r.hidden } })
    } catch (e) {
      setError(e instanceof BattleError ? e.key : 'battle.errors.generic')
    } finally {
      setBusy(false)
    }
  }

  function next() {
    if (!result) return
    setQuestion(result.state.question)
    setResult(null)
    shownAt.current = Date.now()
  }

  async function close(flee: boolean) {
    if (flee && enc?.status === 'active') await fleeEncounter(enc.encounter_id).catch(() => undefined)
    await refreshAll()
    useGame.setState({ battle: null })
  }

  // The Run away / Continue buttons: under the question, or (sideways phones) in the left column, always on screen.
  const actions = (className: string) => (
    <div className={className}>
      {!finished ? (
        <Button variant="secondary" onClick={() => void close(true)} disabled={busy}>
          <Flag size={18} aria-hidden /> {t('battle.flee')}
        </Button>
      ) : (
        <span />
      )}
      {result && !finished && <Button onClick={next}>{t('battle.continue')}</Button>}
      {(finished || (error && !enc)) && <Button onClick={() => void close(false)}>{t('battle.backToVillage')}</Button>}
    </div>
  )

  if (cutscene) return null // the panel steps aside while the defeat cutscene plays (it keeps its state)
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/45 p-3 short:p-1">
      <section role="dialog" aria-modal="true" aria-label={t('battle.title', { name: monsterName })} className="w-full max-w-xl rounded-3xl border-4 border-wood bg-cream shadow-[0_0_0_3px_var(--color-wood-dark),0_16px_40px_rgb(0_0_0/0.4)] short:flex short:max-h-full short:max-w-4xl short:overflow-hidden">
        <header className="flex items-center gap-3 rounded-t-[20px] bg-gradient-to-b from-[#a6d672] to-grass p-3 short:w-52 short:shrink-0 short:flex-col short:justify-center short:rounded-se-none short:rounded-s-[20px]">
          <Snapshot subject={{ kind: 'monster', monster }} px={160} alt="" className={`size-20 shrink-0 sm:size-24 short:size-28 ${result?.correct ? 'battle-hit' : 'hero-bob'}`} />
          <div className="min-w-0 flex-1 space-y-2">
            {enc?.returning && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-wood-dark bg-gold px-2 text-xs font-bold">
                <Sparkles size={12} aria-hidden /> {t('review.badge')}
              </span>
            )}
            <HpBar label={t('battle.monsterHp', { name: monsterName })} name={monsterName} value={enc?.monster_hp ?? 0} max={enc?.monster_max_hp ?? 1} colour="from-[#ff8a80] to-danger" />
            <HpBar label={t('battle.playerHp')} name={t('battle.you')} value={enc?.player_hp ?? 100} max={100} colour="from-[#c5e1a5] to-grass-dark" />
          </div>
          {enc && enc.combo > 1 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border-2 border-wood-dark bg-gold px-2 py-0.5 font-display text-sm font-bold">
              <Zap size={14} aria-hidden /> {t('battle.combo', { n: enc.combo })}
            </span>
          )}
          {actions('hidden w-full flex-col gap-2 short:flex')}
        </header>

        <div className="space-y-4 p-4 short:min-h-0 short:flex-1 short:space-y-1.5 short:overflow-y-auto short:p-2.5">
          {error && (
            <p role="alert" className="rounded-xl border-2 border-danger bg-danger/10 p-2 text-sm font-semibold">
              {t(error)}
            </p>
          )}
          {!enc && !error && <p className="font-display text-wood-dark">{t('common.loading')}</p>}

          {enc && !finished && !result && <HelperBar level={level} helpers={enc.helpers} question={question} onFifty={() => void fifty()} busy={busy} />}
          {question && (!finished || result) && (
            <>
            <BattlePetGuess question={question} guess={result ? guessShown.current : (enc?.pet_guess ?? null)} result={result?.pet} />
            <QuestionCard
              key={question.id}
              question={question}
              hidden={result ? undefined : enc?.helpers.hidden}
              busy={busy}
              result={result}
              onSubmit={submit}
              badge={result && result.damage > 0 && <span className="rounded-full bg-danger px-2 text-sm text-white">{t('battle.damage', { n: result.damage })}</span>}
            >
              {result?.second_chance && <p className="text-sm font-bold text-grass-dark">{t('battle.secondChance')}</p>}
              {result && !result.correct && <MyPetCheer />}
              {result?.correct && (result.farmed ? <p className="text-sm font-semibold text-wood-dark">{t('battle.farmed')}</p> : <Rewards xp={result.xp_gained - result.bonus.xp} gold={result.gold_gained - result.bonus.gold} />)}
              <MissionNotes ids={result?.missions_completed} />
            </QuestionCard>
            </>
          )}

          {finished && enc && (
            <div className="space-y-3 text-center">
              <p className="font-display text-3xl font-bold text-wood-dark">{enc.status === 'won' ? t('battle.victory') : t('battle.lost')}</p>
              <p>{enc.status === 'won' ? t('battle.victoryText', { name: monsterName }) : t('battle.lostText', { name: monsterName })}</p>
              <div className="flex justify-center">
                <Rewards xp={earned.xp} gold={earned.gold} />
              </div>
              {result?.returning_bonus && <p className="font-bold text-path-dark">{t('review.bonus', result.returning_bonus)}</p>}
              {earned.leveledTo > 0 && <LevelUp level={earned.leveledTo} from={startLevel} />}
            </div>
          )}

          {actions('flex justify-between gap-2 border-t-2 border-wood/20 pt-3 short:hidden')}
        </div>
      </section>
    </div>
  )
}

export function HpBar({ label, name, value, max, colour }: { label: string; name: string; value: number; max: number; colour: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="flex justify-between gap-2 text-xs font-bold text-ink">
        <span className="truncate">{name}</span>
        <span>
          {value} / {max}
        </span>
      </div>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-3.5 overflow-hidden rounded-full border-2 border-wood-dark bg-wood-dark/70">
        <div className={`h-full rounded-full bg-gradient-to-b ${colour} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Rewards({ xp, gold }: { xp: number; gold: number }) {
  const { t } = useTranslation()
  return (
    <p className="inline-flex items-center gap-3 rounded-full bg-cream px-3 py-1 text-sm font-bold text-wood-dark">
      <span className="flex items-center gap-1">
        <Sparkles size={16} className="text-water-dark" aria-hidden /> {t('battle.xp', { n: xp })}
      </span>
      <span className="flex items-center gap-1">
        <Coins size={16} className="text-path-dark" aria-hidden /> {t('battle.gold', { n: gold })}
      </span>
    </p>
  )
}

export function MissionNotes({ ids }: { ids?: string[] }) {
  const { t } = useTranslation()
  return (
    <>
      {ids?.map((id) => (
        <p key={id} className="flex items-center gap-2 rounded-xl border-2 border-wood-dark bg-gold/60 px-3 py-1 text-sm font-bold">
          <Gift size={16} aria-hidden /> {t('battle.missionDone', { name: t(`missions.${id}`, { subject: t('missions.anySubject') }) })}
        </p>
      ))}
    </>
  )
}

export function LevelUp({ level, from }: { level: number; from?: number }) {
  const { t } = useTranslation()
  const unlocked = from !== undefined ? newUnlocks(from, level) : []
  return (
    <div className="space-y-2">
      <p className="flex items-center justify-center gap-2 rounded-2xl border-[3px] border-wood-dark bg-gold p-2 font-display text-lg font-bold">
        <Star className="fill-current" aria-hidden /> {t('battle.levelUp', { level })}
      </p>
      {unlocked.length > 0 && (
        <div className="rounded-2xl border-[3px] border-grass-dark bg-grass/20 p-2 text-start">
          <p className="flex items-center gap-2 font-display font-bold">
            <Unlock size={18} aria-hidden /> {t('battle.newUnlocks')}
          </p>
          <ul className="ms-7 list-disc text-sm font-semibold">
            {unlocked.map((u) => (
              <li key={u.key}>{t(`unlocks.${u.key}`)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
