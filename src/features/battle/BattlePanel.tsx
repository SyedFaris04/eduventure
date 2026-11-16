import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Coins, Flag, Sparkles, Star, X, Zap } from 'lucide-react'
import { Button } from '../../components/ui'
import { useGame } from '../../game/store'
import type { MonsterKind } from '../../game/map'
import { monsterDataUri } from '../../game/art/monsters'
import { useSession } from '../authentication/useSession'
import { playChime } from '../loading/sound'
import { answerQuestion, BattleError, fleeEncounter, startEncounter, type AnswerPayload, type AnswerResult, type EncounterState } from './battleApi'
import type { PublicQuestion } from './questionSchema'

const MIN_READ_MS = 1600 // the server rejects answers sooner than 1.5 s after a question appears

export function BattlePanel() {
  const battle = useGame((s) => s.battle)
  if (!battle) return null
  return <Battle key={battle.monsterId} monsterId={battle.monsterId} kind={battle.monster} />
}

function Battle({ monsterId, kind }: { monsterId: string; kind: MonsterKind }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const [enc, setEnc] = useState<EncounterState | null>(null)
  const [question, setQuestion] = useState<PublicQuestion | null>(null)
  const [chosen, setChosen] = useState<AnswerPayload | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [earned, setEarned] = useState({ xp: 0, gold: 0, leveledTo: 0 })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const shownAt = useRef(0)
  const firstAction = useRef<HTMLButtonElement | HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    startEncounter(kind)
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

  useEffect(() => {
    if (question && !result) firstAction.current?.focus()
  }, [question, result])

  const monster = enc?.monster_id ?? kind
  const monsterName = t(`monsters.${monster}.name`)
  const finished = enc && enc.status !== 'active'

  async function submit(answer: AnswerPayload) {
    if (!enc || busy || result) return
    setBusy(true)
    setError(null)
    setChosen(answer)
    const wait = MIN_READ_MS - (Date.now() - shownAt.current)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    try {
      const r = await answerQuestion(enc.encounter_id, answer)
      setResult(r)
      setEnc(r.state)
      // The HUD shows the server's new totals straight away.
      queryClient.setQueryData(['progression', session?.user.id], { xp: Number(r.totals.xp), level: r.totals.level, gold: Number(r.totals.gold) })
      setEarned((e) => ({ xp: e.xp + r.xp_gained, gold: e.gold + r.gold_gained, leveledTo: r.leveled_up ? r.totals.level : e.leveledTo }))
      playChime(r.correct ? 'tap' : 'pop')
      if (r.state.status === 'won') {
        useGame.setState((s) => ({ defeated: [...s.defeated, monsterId] }))
        playChime('done')
      }
    } catch (e) {
      setChosen(null)
      setError(e instanceof BattleError ? e.key : 'battle.errors.generic')
    } finally {
      setBusy(false)
    }
  }

  function next() {
    if (!result) return
    setQuestion(result.state.question)
    setResult(null)
    setChosen(null)
    setText('')
    shownAt.current = Date.now()
  }

  async function close(flee: boolean) {
    if (flee && enc?.status === 'active') await fleeEncounter(enc.encounter_id).catch(() => undefined)
    await queryClient.invalidateQueries({ queryKey: ['progression', session?.user.id] })
    useGame.setState({ battle: null })
  }

  const onText = (e: FormEvent) => {
    e.preventDefault()
    if (!question || !text.trim()) return
    void submit(question.type === 'numeric' ? { value: text.trim() } : { text: text.trim() })
  }

  const answerText = (r: AnswerResult) => {
    const a = r.correct_answer
    if (typeof a === 'string') return question?.type === 'true_false' ? t(`battle.${a}`) : (question?.options?.find((o) => o.id === a)?.text ?? a)
    if ('value' in a) return `${a.value}${a.unit ? ` ${a.unit}` : ''}`
    return a.accept[0]
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/45 p-3">
      <section role="dialog" aria-modal="true" aria-label={t('battle.title', { name: monsterName })} className="w-full max-w-xl rounded-3xl border-4 border-wood bg-cream shadow-[0_0_0_3px_var(--color-wood-dark),0_16px_40px_rgb(0_0_0/0.4)]">
        {/* Combatants */}
        <header className="flex items-center gap-3 rounded-t-[20px] bg-gradient-to-b from-[#a6d672] to-grass p-3">
          <img src={monsterDataUri(monster, 160)} alt="" className={`size-20 shrink-0 sm:size-24 ${result?.correct ? 'battle-hit' : 'hero-bob'}`} />
          <div className="min-w-0 flex-1 space-y-2">
            <HpBar label={t('battle.monsterHp', { name: monsterName })} name={monsterName} value={enc?.monster_hp ?? 0} max={enc?.monster_max_hp ?? 1} colour="from-[#ff8a80] to-danger" />
            <HpBar label={t('battle.playerHp')} name={t('battle.you')} value={enc?.player_hp ?? 100} max={100} colour="from-[#c5e1a5] to-grass-dark" />
          </div>
          {enc && enc.combo > 1 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border-2 border-wood-dark bg-gold px-2 py-0.5 font-display text-sm font-bold">
              <Zap size={14} aria-hidden /> {t('battle.combo', { n: enc.combo })}
            </span>
          )}
        </header>

        <div className="space-y-4 p-4">
          {error && (
            <p role="alert" className="rounded-xl border-2 border-danger bg-danger/10 p-2 text-sm font-semibold">
              {t(error)}
            </p>
          )}

          {!enc && !error && <p className="font-display text-wood-dark">{t('common.loading')}</p>}

          {/* Question */}
          {question && !finished && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-water/40 px-2 py-0.5 text-ink">{t(`battle.subject.${question.subject}`, { defaultValue: question.subject })}</span>
                <span className="text-gold" aria-label={t('battle.difficulty', { n: question.difficulty })}>
                  {'★'.repeat(question.difficulty)}
                </span>
                {question.status !== 'published' && <span className="rounded-full border-2 border-path-dark bg-path/40 px-2 py-0.5 text-ink">{t('battle.draft')}</span>}
              </div>
              <p className="font-display text-xl leading-snug font-semibold">{question.prompt}</p>

              {(question.type === 'mcq' || question.type === 'true_false') && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(question.type === 'mcq' ? question.options! : [{ id: 'true', text: t('battle.true') }, { id: 'false', text: t('battle.false') }]).map((o, i) => {
                    const picked = chosen && 'choice' in chosen && chosen.choice === o.id
                    const isRight = result && typeof result.correct_answer === 'string' && result.correct_answer === o.id
                    return (
                      <button
                        key={o.id}
                        ref={i === 0 ? (el) => void (firstAction.current = el) : undefined}
                        type="button"
                        disabled={busy || Boolean(result)}
                        onClick={() => submit({ choice: o.id })}
                        className={`flex min-h-12 items-center gap-2 rounded-2xl border-[3px] px-3 py-2 text-start font-semibold transition disabled:cursor-default ${
                          isRight ? 'border-grass-dark bg-grass/30' : picked && result ? 'border-danger bg-danger/15' : picked ? 'border-wood-dark bg-gold/40' : 'border-wood/50 bg-white hover:border-wood'
                        }`}
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-wood text-sm text-cream">{question.type === 'mcq' ? String.fromCharCode(65 + i) : i ? '✗' : '✓'}</span>
                        {o.text}
                      </button>
                    )
                  })}
                </div>
              )}

              {(question.type === 'numeric' || question.type === 'fill_blank') && (
                <form onSubmit={onText} className="flex gap-2">
                  <label className="flex flex-1 items-center gap-2 rounded-xl border-[3px] border-wood/60 bg-white px-3 focus-within:border-water-dark">
                    <span className="sr-only">{t('battle.yourAnswer')}</span>
                    <input
                      ref={(el) => void (firstAction.current = el)}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={busy || Boolean(result)}
                      inputMode={question.type === 'numeric' ? 'decimal' : 'text'}
                      autoComplete="off"
                      className="min-h-12 w-full bg-transparent text-lg outline-none"
                    />
                    {question.unit && <span className="font-semibold text-wood-dark">{question.unit}</span>}
                  </label>
                  <Button type="submit" disabled={busy || Boolean(result) || !text.trim()}>
                    {t('battle.submit')}
                  </Button>
                </form>
              )}
              {busy && <p className="text-sm font-semibold text-wood-dark">{t('battle.checking')}</p>}
            </div>
          )}

          {/* Feedback */}
          {result && (
            <div aria-live="polite" className={`space-y-2 rounded-2xl border-[3px] p-3 ${result.correct ? 'border-grass-dark bg-grass/15' : 'border-path-dark bg-path/20'}`}>
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                {result.correct ? <Check className="text-grass-dark" aria-hidden /> : <X className="text-danger" aria-hidden />}
                {result.correct ? t('battle.correct') : t('battle.wrong')}
                {result.damage > 0 && <span className="ms-auto rounded-full bg-danger px-2 text-sm text-white">{t('battle.damage', { n: result.damage })}</span>}
              </p>
              {!result.correct && <p className="font-semibold">{t('battle.correctAnswerIs', { answer: answerText(result) })}</p>}
              {result.wrong_reason && <p className="text-sm">{result.wrong_reason}</p>}
              <p className="text-sm">{result.explanation}</p>
              {result.correct && (result.farmed ? <p className="text-sm font-semibold text-wood-dark">{t('battle.farmed')}</p> : <Rewards xp={result.xp_gained - result.bonus.xp} gold={result.gold_gained - result.bonus.gold} />)}
            </div>
          )}

          {/* End of battle */}
          {finished && enc && (
            <div className="space-y-3 text-center">
              <p className="font-display text-3xl font-bold text-wood-dark">{enc.status === 'won' ? t('battle.victory') : t('battle.lost')}</p>
              <p>{enc.status === 'won' ? t('battle.victoryText', { name: monsterName }) : t('battle.lostText', { name: monsterName })}</p>
              <div className="flex justify-center">
                <Rewards xp={earned.xp} gold={earned.gold} />
              </div>
              {earned.leveledTo > 0 && (
                <p className="flex items-center justify-center gap-2 rounded-2xl border-[3px] border-wood-dark bg-gold p-2 font-display text-lg font-bold">
                  <Star className="fill-current" aria-hidden /> {t('battle.levelUp', { level: earned.leveledTo })}
                </p>
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
            {(finished || (error && !enc)) && <Button onClick={() => void close(false)}>{t('battle.backToVillage')}</Button>}
          </div>
        </div>
      </section>
    </div>
  )
}

function HpBar({ label, name, value, max, colour }: { label: string; name: string; value: number; max: number; colour: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-ink">
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

function Rewards({ xp, gold }: { xp: number; gold: number }) {
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
