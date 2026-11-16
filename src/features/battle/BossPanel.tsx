import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flag, Heart, Lock } from 'lucide-react'
import { Button } from '../../components/ui'
import { useGame, reactToAnswer } from '../../game/store'
import type { BossId } from '../../game/map'
import { isUnlocked, unlockLevel } from '../../game/unlocks'
import { Snapshot } from '../../world3d/SnapshotImage'
import { playChime } from '../loading/sound'
import { answerBoss, askBossFifty, BattleError, fleeBoss, startBoss, type AnswerPayload, type BossResult, type BossState } from './battleApi'
import type { PublicQuestion } from './questionSchema'
import { QuestionCard } from './QuestionCard'
import { LevelUp, MIN_READ_MS, MissionNotes, Rewards, usePlayerLevel, useProgressRefresh } from './BattlePanel'
import { HelperBar } from './HelperBar'

const GUARDIAN_ROUNDS = ['maths', 'science', 'wisdom', 'final'] as const
const ISLAND_ROUNDS = ['r1', 'r2', 'r3', 'final'] as const

/** Level an island boss still needs, or null when the player may fight (the server checks again). */
export const bossLockedAt = (boss: BossId, level: number) => (boss === 'guardian' || isUnlocked(level, 'boss', 'island_bosses') ? null : unlockLevel('boss', 'island_bosses'))

/** Boss copy: the Guardian keeps its original texts; island bosses have their own. */
const bossText = (boss: BossId, key: string) => (boss === 'guardian' ? `boss.${key}` : `bosses.${boss}.${key}`)

export function BossPanel() {
  const boss = useGame((s) => s.boss)
  return boss ? <BossGate key={boss} id={boss} /> : null
}

function BossGate({ id }: { id: BossId }) {
  const { level, loaded } = usePlayerLevel()
  if (!loaded) return null
  const at = bossLockedAt(id, level)
  return at ? <BossLocked boss={id} level={at} onClose={() => useGame.setState({ boss: null })} /> : <Boss id={id} />
}

/** Shown instead of the fight when the player's level is too low for an island boss. */
export function BossLocked({ boss, level, onClose }: { boss: BossId; level: number; onClose: () => void }) {
  const { t } = useTranslation()
  const name = t(bossText(boss, 'name'))
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/55 p-3">
      <section role="dialog" aria-modal="true" aria-label={name} className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border-4 border-wood bg-cream p-5 text-center shadow-[0_0_0_3px_var(--color-wood-dark)]">
        <Snapshot subject={{ kind: 'boss', boss }} px={160} alt="" className="size-24" />
        <p className="font-display text-xl font-bold text-wood-dark">{name}</p>
        <p className="flex items-center gap-2 font-semibold">
          <Lock size={18} aria-hidden /> {t('boss.locked', { level, name })}
        </p>
        <Button onClick={onClose}>{t('battle.backToVillage')}</Button>
      </section>
    </div>
  )
}

function Boss({ id }: { id: BossId }) {
  const { t } = useTranslation()
  const { setTotals, refreshAll } = useProgressRefresh()
  const [run, setRun] = useState<BossState | null>(null)
  const [question, setQuestion] = useState<PublicQuestion | null>(null)
  const [result, setResult] = useState<BossResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const shownAt = useRef(0)
  const { level, startLevel } = usePlayerLevel()


  useEffect(() => {
    let cancelled = false
    startBoss(id)
      .then((s) => {
        if (cancelled) return
        setRun(s)
        setQuestion(s.question)
        shownAt.current = Date.now()
      })
      .catch((e) => !cancelled && setError(e instanceof BattleError ? e.key : 'battle.errors.generic'))
    return () => {
      cancelled = true
    }
  }, [id])

  const finished = run && run.status !== 'active'
  // An unfinished run of another boss resumes first, so show the boss the server actually returned.
  const shown: BossId = run?.boss_id ?? id
  const name = t(bossText(shown, 'name'))
  const roundKeys = shown === 'guardian' ? GUARDIAN_ROUNDS : ISLAND_ROUNDS

  async function submit(answer: AnswerPayload) {
    if (!run || busy || result) return
    setBusy(true)
    setError(null)
    const wait = MIN_READ_MS - (Date.now() - shownAt.current)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    try {
      const r = await answerBoss(run.run_id, answer)
      setResult(r)
      setRun(r.state)
      setTotals(r.totals)
      playChime(r.correct ? 'tap' : 'pop')
      reactToAnswer(r.correct, r.state.status === 'won')
      if (r.state.status === 'won') playChime('done')
    } catch (e) {
      setError(e instanceof BattleError ? e.key : 'battle.errors.generic')
    } finally {
      setBusy(false)
    }
  }

  async function fifty() {
    if (!run || busy) return
    setBusy(true)
    try {
      const r = await askBossFifty(run.run_id)
      setRun({ ...run, helpers: { ...run.helpers, fifty_used: true, hidden: r.hidden } })
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
    if (flee && run?.status === 'active') await fleeBoss(run.run_id).catch(() => undefined)
    await refreshAll()
    useGame.setState({ boss: null })
  }

  const roundKey = roundKeys[(run?.round ?? 1) - 1]

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/55 p-3">
      <section role="dialog" aria-modal="true" aria-label={t(bossText(shown, 'title'))} className="w-full max-w-xl rounded-3xl border-4 border-wood bg-cream shadow-[0_0_0_3px_var(--color-wood-dark),0_16px_40px_rgb(0_0_0/0.4)]">
        <header className="flex items-center gap-3 rounded-t-[20px] bg-gradient-to-b from-[#8fa3c7] to-[#5e7aa6] p-3 text-cream">
          <Snapshot subject={{ kind: 'boss', boss: shown }} px={160} alt="" className={`size-20 shrink-0 sm:size-24 ${result?.correct ? 'battle-hit' : 'hero-bob'}`} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-display text-lg font-bold">{name}</p>
            {run && (
              <>
                <ol aria-label={t('boss.roundOf', { n: run.round, total: run.rounds })} className="flex gap-1">
                  {roundKeys.map((k, i) => (
                    <li
                      key={k}
                      className={`flex-1 rounded-full border-2 border-wood-dark px-1 text-center text-[11px] font-bold ${i + 1 < run.round || run.status === 'won' ? 'bg-grass text-ink' : i + 1 === run.round ? 'bg-gold text-ink' : 'bg-cream/40 text-cream'}`}
                    >
                      {t(`boss.rounds.${k}`)}
                    </li>
                  ))}
                </ol>
                <div className="flex items-center justify-between text-sm font-bold">
                  <span aria-label={t('boss.progress', { n: run.round_progress, total: run.per_round })}>
                    {'●'.repeat(run.round_progress)}
                    {'○'.repeat(run.per_round - run.round_progress)}
                  </span>
                  <span className="flex gap-0.5" aria-label={t('boss.hearts', { n: run.hearts })}>
                    {Array.from({ length: 3 }, (_, i) => (
                      <Heart key={i} size={18} className={i < run.hearts ? 'fill-danger text-danger' : 'text-cream/60'} aria-hidden />
                    ))}
                  </span>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="space-y-4 p-4">
          {error && (
            <p role="alert" className="rounded-xl border-2 border-danger bg-danger/10 p-2 text-sm font-semibold">
              {t(error)}
            </p>
          )}
          {!run && !error && <p className="font-display text-wood-dark">{t('common.loading')}</p>}
          {run && !finished && !result && <p className="text-sm font-semibold text-wood-dark">{t(bossText(shown, `intro.${roundKey}`))}</p>}

          {run && !finished && !result && <HelperBar level={level} helpers={run.helpers} question={question} onFifty={() => void fifty()} busy={busy} />}
          {question && (!finished || result) && (
            <QuestionCard key={question.id} question={question} hidden={result ? undefined : run?.helpers.hidden} busy={busy} result={result} onSubmit={submit}>
              {result?.second_chance && <p className="text-sm font-bold text-grass-dark">{t('battle.secondChance')}</p>}
              <MissionNotes ids={result?.missions_completed} />
            </QuestionCard>
          )}

          {finished && run && (
            <div className="space-y-3 text-center">
              <p className="font-display text-3xl font-bold text-wood-dark">{run.status === 'won' ? t(bossText(shown, 'victory')) : t('battle.lost')}</p>
              <p>{run.status === 'won' ? t(bossText(shown, 'victoryText')) : t(bossText(shown, 'lostText'))}</p>
              {result?.reward && (
                <div className="flex flex-col items-center gap-2">
                  {result.reward.already_today ? <p className="text-sm font-semibold">{t(bossText(shown, 'alreadyToday'))}</p> : <Rewards xp={result.reward.xp} gold={result.reward.gold} />}
                  {result.reward.leveled_up && <LevelUp level={result.totals.level} from={startLevel} />}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between gap-2 border-t-2 border-wood/20 pt-3">
            {!finished ? (
              <Button variant="secondary" onClick={() => void close(true)} disabled={busy}>
                <Flag size={18} aria-hidden /> {t('battle.flee')}
              </Button>
            ) : (
              <span />
            )}
            {result && !finished && <Button onClick={next}>{t('battle.continue')}</Button>}
            {(finished || (error && !run)) && <Button onClick={() => void close(false)}>{t('battle.backToVillage')}</Button>}
          </div>
        </div>
      </section>
    </div>
  )
}
