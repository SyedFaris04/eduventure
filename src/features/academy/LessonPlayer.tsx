import { playSfx } from '../../audio/engine'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Coins, Eye, Lightbulb, Play, Sparkles, Trophy, X } from 'lucide-react'
import { Button, ProgressBar } from '../../components/ui'
import { useSession } from '../authentication/useSession'
import { LevelUp, usePlayerLevel } from '../battle/BattlePanel'
import { AcademyError, answerStep, completeLesson, lessonSolution, noteWriteAttempt, progressKey, startLesson, type CourseLang, type Lang, type LessonDone, type LessonStart, type LessonStep, type StepAnswer, type StepResult } from './academyApi'
import { checkWrite } from './checkWrite'
import { fixLine } from './fixLine'
import { KeyRow } from './KeyRow'
import { resetRunner, runCode, runnerFor, type RunResult } from './runner/runner'
import { Terminal, type RunStatus } from './Terminal'
import type { EditorApi } from './CodeEditor'
import { LanguageStep } from './LanguageStep'
import { loadVoices, pickVoice } from './speech'

const CodeEditor = lazy(() => import('./CodeEditor'))

type Props = { courseId: string; lessonId: string; language: CourseLang; onExit: () => void; onNext?: () => void }
const isCode = (l: CourseLang): l is Lang => l === 'python' || l === 'javascript'

/** One lesson: Learn, Predict, Fix and Write steps in order, then the reward (paid once, by the server). */
export function LessonPlayer({ courseId, lessonId, language, onExit, onNext }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<LessonStart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState<LessonDone | null>(null)
  const [finishing, setFinishing] = useState(false)
  const { startLevel } = usePlayerLevel()
  const queryClient = useQueryClient()
  const { session } = useSession()

  useEffect(() => {
    let live = true
    // Language lessons wait briefly for the device's voices: without one, listening steps are skipped (a bonus anyway).
    Promise.all([startLesson(lessonId), isCode(language) ? Promise.resolve([]) : loadVoices()])
      .then(([d, voices]) => {
        if (!live) return
        const speaks = isCode(language) || pickVoice(voices, language) !== null
        setData(speaks ? d : { ...d, steps: d.steps.filter((s) => s.kind !== 'listen') })
      })
      .catch((e) => live && setError(e instanceof AcademyError ? e.key : 'academy.errors.generic'))
    // Python downloads while the learner reads the first step.
    if (language === 'python') runnerFor('python').ready().catch(() => undefined)
    return () => {
      live = false
    }
  }, [lessonId, language])

  async function finish() {
    if (!data || finishing) return
    setFinishing(true)
    try {
      const r = await completeLesson(data.attempt_id)
      setDone(r)
      playSfx('lesson')
      queryClient.setQueryData(['progression', session?.user.id], { xp: Number(r.totals.xp), level: r.totals.level, gold: Number(r.totals.gold) })
      await queryClient.invalidateQueries({ queryKey: progressKey(courseId) })
    } catch (e) {
      setError(e instanceof AcademyError ? e.key : 'academy.errors.generic')
    } finally {
      setFinishing(false)
    }
  }

  if (error && !data) return <Notice text={t(error)} onExit={onExit} />
  if (!data) return <p className="p-6 text-center font-display text-wood-dark">{t('common.loading')}</p>
  if (done) return <Done done={done} from={startLevel} onExit={onExit} onNext={onNext} />

  const step = data.steps[index]
  const last = index === data.steps.length - 1
  const solved = data.results.some((r) => r.step_id === step.id && r.correct)
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 p-3">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onExit} aria-label={t('academy.backToCourse')} className="rounded-xl p-2 hover:bg-wood/10">
          <X aria-hidden />
        </button>
        <div className="flex-1">
          <p className="font-display text-lg font-bold text-wood-dark">{data.lesson.title}</p>
          <ProgressBar thin value={index / data.steps.length} label={t('academy.step', { n: index + 1, total: data.steps.length })} className="h-3!" />
        </div>
      </header>
      {error && (
        <p role="alert" className="rounded-xl border-2 border-danger bg-danger/10 p-2 text-sm font-semibold">
          {t(error)}
        </p>
      )}
      {!isCode(language) ? (
        <LanguageStep
          key={step.id}
          step={step}
          attempt={data.attempt_id}
          language={language}
          alreadySolved={solved}
          last={last}
          finishing={finishing}
          onError={setError}
          onContinue={() => {
            setError(null)
            if (last) void finish()
            else setIndex((i) => i + 1)
          }}
        />
      ) : (
      <StepView
        key={step.id}
        step={step}
        attempt={data.attempt_id}
        language={language as Lang}
        alreadySolved={solved}
        last={last}
        finishing={finishing}
        onError={setError}
        onContinue={() => {
          setError(null)
          if (last) void finish()
          else setIndex((i) => i + 1)
        }}
      />
      )}
    </div>
  )
}

function StepView({ step, attempt, language, alreadySolved, last, finishing, onError, onContinue }: { step: LessonStep; attempt: string; language: Lang; alreadySolved: boolean; last: boolean; finishing: boolean; onError: (k: string | null) => void; onContinue: () => void }) {
  const { t } = useTranslation()
  const editable = step.kind === 'fix' || step.kind === 'write'
  const [code, setCode] = useState(step.kind === 'write' ? (step.starter ?? '') : (step.code ?? ''))
  const [run, setRun] = useState<RunResult | null>(null)
  const [status, setStatus] = useState<RunStatus>('idle')
  const [marked, setMarked] = useState<StepResult | null>(null)
  const [passed, setPassed] = useState(step.kind === 'learn' || alreadySolved)
  const [note, setNote] = useState<string | null>(null)
  const [fails, setFails] = useState(0)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const editor = useRef<EditorApi | null>(null)

  async function execute(source: string): Promise<RunResult | null> {
    setStatus(language === 'python' ? 'loading' : 'running')
    try {
      await runnerFor(language).ready()
      setStatus('running')
      const r = await runCode(language, source)
      setRun(r)
      setStatus('idle')
      return r
    } catch {
      setStatus('unavailable')
      return null
    }
  }
  const retry = () => {
    resetRunner(language)
    void execute(code)
  }

  async function mark(answer: StepAnswer) {
    if (busy || passed) return
    setBusy(true)
    onError(null)
    try {
      const r = await answerStep(attempt, step.id, answer)
      setMarked(r)
      playSfx(r.correct ? 'correct' : 'wrong')
      if (r.correct) setPassed(true)
    } catch (e) {
      onError(e instanceof AcademyError ? e.key : 'academy.errors.generic')
    } finally {
      setBusy(false)
    }
  }

  async function checkFix() {
    const f = fixLine(step.code ?? '', code, step.broken_line ?? 1)
    if ('error' in f) {
      setNote(t(f.error === 'line-count' ? 'academy.fixLineCount' : 'academy.fixOtherLines', { n: step.broken_line }))
      return
    }
    setNote(null)
    void execute(code)
    await mark({ line: f.line })
  }

  async function checkWriteStep() {
    const r = await execute(code)
    if (!r) return
    const c = checkWrite(code, r.stdout, { expected_output: step.expected_output ?? '', must_use: step.must_use })
    if (c.ok) {
      setPassed(true)
      setNote(null)
      return
    }
    setFails((n) => n + 1)
    setNote(c.reason === 'must_use' ? t('academy.mustUse', { token: c.missing }) : t('academy.writeWrongOutput', { expected: step.expected_output }))
    noteWriteAttempt(attempt, step.id).catch(() => undefined)
  }

  async function showAnswer() {
    try {
      setCode(await lessonSolution(attempt, step.id))
    } catch (e) {
      onError(e instanceof AcademyError ? e.key : 'academy.errors.generic')
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p className="rounded-2xl border-[3px] border-wood bg-cream p-3 text-lg font-semibold">{step.text}</p>
        <Suspense fallback={<div className="min-h-24 rounded-[14px] bg-[#1f2433]" />}>
          <CodeEditor key={`${step.id}-${editable}`} value={code} onChange={editable ? setCode : undefined} language={language} readOnly={!editable} label={editable ? t('academy.yourCode') : t('academy.code')} apiRef={editor} />
        </Suspense>
        {editable && <KeyRow language={language} onKey={(k) => (editor.current ? editor.current.insert(k) : setCode((c) => c + k))} disabled={passed} />}
      </div>

      <div className="flex flex-col gap-3">
        {step.kind === 'predict' && step.options && (
          <div className="grid gap-2 sm:grid-cols-2">
            {step.options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={busy || passed}
                onClick={() => void mark({ choice: o.id })}
                className={`min-h-12 rounded-2xl border-[3px] px-3 py-2 text-start font-mono font-semibold whitespace-pre-wrap ${passed && marked?.accepted === o.id ? 'border-grass-dark bg-grass/30' : 'border-wood/50 bg-white hover:border-wood'}`}
              >
                {o.text}
              </button>
            ))}
          </div>
        )}
        {step.kind === 'predict' && !step.options && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void mark({ text: typed })
            }}
          >
            <label className="text-sm font-bold text-wood-dark" htmlFor={`${step.id}-typed`}>
              {t('academy.yourAnswer')}
            </label>
            <textarea id={`${step.id}-typed`} rows={2} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={passed} className="rounded-xl border-[3px] border-wood/60 bg-white p-2 font-mono" autoCapitalize="off" spellCheck={false} />
            {!passed && (
              <Button type="submit" disabled={busy || !typed.trim()}>
                <Check size={18} aria-hidden /> {t('academy.check')}
              </Button>
            )}
          </form>
        )}

        {marked && (
          <div role="status" className={`rounded-2xl border-[3px] p-3 ${marked.correct ? 'border-grass-dark bg-grass/20' : 'border-danger bg-danger/10'}`}>
            <p className="font-display font-bold">{marked.correct ? t('academy.correct') : t('academy.wrong')}</p>
            {marked.explanation && <p className="text-sm">{marked.explanation}</p>}
            {!marked.correct && marked.accepted && <p className="mt-1 font-mono text-sm font-semibold whitespace-pre-wrap">{t('academy.answerWas', { answer: optionText(step, marked.accepted) })}</p>}
          </div>
        )}
        {note && (
          <p role="status" className="rounded-2xl border-[3px] border-path-dark bg-path/30 p-3 text-sm font-semibold whitespace-pre-wrap">
            {note}
          </p>
        )}
        {step.kind === 'write' && !passed && fails >= 1 && step.hint && (
          <p className="flex items-start gap-2 text-sm font-semibold text-wood-dark">
            <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden /> {step.hint}
          </p>
        )}

        {(step.kind !== 'predict' || run) && <Terminal result={run} status={status} onRetry={retry} />}

        <div className="flex flex-wrap justify-end gap-2">
          {step.kind !== 'predict' && (
            <Button variant="secondary" onClick={() => void execute(code)} disabled={status === 'loading' || status === 'running'}>
              <Play size={18} aria-hidden /> {t('academy.run')}
            </Button>
          )}
          {step.kind === 'fix' && !passed && (
            <Button onClick={() => void checkFix()} disabled={busy}>
              <Check size={18} aria-hidden /> {t('academy.check')}
            </Button>
          )}
          {step.kind === 'write' && !passed && (
            <>
              {fails >= 2 && (
                <Button variant="secondary" onClick={() => void showAnswer()}>
                  <Eye size={18} aria-hidden /> {t('academy.showAnswer')}
                </Button>
              )}
              <Button onClick={() => void checkWriteStep()} disabled={status === 'loading' || status === 'running'}>
                <Check size={18} aria-hidden /> {t('academy.check')}
              </Button>
            </>
          )}
          {passed && (
            <Button onClick={onContinue} disabled={finishing}>
              {last ? t('academy.finish') : t('academy.continue')} <ArrowRight size={18} className="rtl:rotate-180" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

const optionText = (step: LessonStep, accepted: string) => step.options?.find((o) => o.id === accepted)?.text ?? accepted

function Done({ done, from, onExit, onNext }: { done: LessonDone; from: number; onExit: () => void; onNext?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center">
      <Trophy size={56} className="text-gold drop-shadow-[0_3px_0_var(--color-wood-dark)]" aria-hidden />
      <p className="font-display text-3xl font-bold text-wood-dark">{t('academy.done')}</p>
      {done.first_time ? (
        <p className="flex items-center gap-4 rounded-full bg-cream px-4 py-1.5 font-display text-xl font-bold text-wood-dark">
          <span className="flex items-center gap-1">
            <Sparkles size={20} className="text-water-dark" aria-hidden /> {t('academy.rewardXp', { n: done.xp })}
          </span>
          <span className="flex items-center gap-1">
            <Coins size={20} className="text-path-dark" aria-hidden /> {t('academy.rewardGold', { n: done.gold })}
          </span>
        </p>
      ) : (
        <p className="font-semibold">{t('academy.alreadyEarned')}</p>
      )}
      {done.leveled_up && <LevelUp level={done.totals.level} from={from} />}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={onExit}>
          {t('academy.backToCourse')}
        </Button>
        {onNext && (
          <Button onClick={onNext}>
            {t('academy.next')} <ArrowRight size={18} className="rtl:rotate-180" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  )
}

function Notice({ text, onExit }: { text: string; onExit: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-6 text-center">
      <p className="font-semibold">{text}</p>
      <Button onClick={onExit}>{t('academy.backToCourse')}</Button>
    </div>
  )
}
