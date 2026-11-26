import { WhyNot } from './WhyNot'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react'
import { Button } from '../../components/ui'
import type { AnswerPayload, AnswerResult } from './battleApi'
import type { PublicQuestion } from './questionSchema'

export type Marked = Pick<AnswerResult, 'correct' | 'correct_answer' | 'explanation' | 'wrong_reason'>
type Opt = { id: string; text: string }
type Pairs = { left: Opt[]; right: Opt[] }

/** Human-readable correct answer for any question type. Used by battles and the Academic Library. */
export function formatAnswer(question: Pick<PublicQuestion, 'type' | 'options' | 'unit'>, answer: unknown, t: (k: string) => string): string {
  const list = Array.isArray(question.options) ? (question.options as Opt[]) : []
  const text = (id: string) => list.find((o) => o.id === id)?.text ?? id
  if (typeof answer === 'string') return question.type === 'true_false' ? t(`battle.${answer}`) : text(answer)
  if (Array.isArray(answer)) return answer.map(text).join(question.type === 'ordering' ? ' → ' : ', ')
  const a = answer as { value?: number; unit?: string; accept?: string[] } & Record<string, string>
  if (typeof a.value === 'number') return `${a.value}${question.unit ? ` ${question.unit}` : ''}`
  if (a.accept) return a.accept[0]
  const pairs = question.options as Pairs
  return Object.entries(a)
    .map(([l, r]) => `${pairs.left.find((o) => o.id === l)?.text ?? l} → ${pairs.right.find((o) => o.id === r)?.text ?? r}`)
    .join('; ')
}

/**
 * One question with its answer controls and, once marked, the feedback. Shared by monster battles and
 * the boss. Remount it (key = question id) for each new question.
 */
export function QuestionCard({ question, hidden, busy, result, onSubmit, badge, children }: { question: PublicQuestion; hidden?: string[]; busy: boolean; result: Marked | null; onSubmit: (a: AnswerPayload) => void; badge?: ReactNode; children?: ReactNode }) {
  const { t } = useTranslation()
  const [chosen, setChosen] = useState<AnswerPayload | null>(null)
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [order, setOrder] = useState<Opt[]>(() => (question.type === 'ordering' ? (question.options as Opt[]) : []))
  const [pairs, setPairs] = useState<Record<string, string>>({})
  const first = useRef<HTMLButtonElement | HTMLInputElement | HTMLSelectElement | null>(null)
  const locked = busy || Boolean(result)

  useEffect(() => {
    if (!result) first.current?.focus()
  }, [result])

  const submit = (a: AnswerPayload) => {
    if (locked) return
    setChosen(a)
    onSubmit(a)
  }
  const onText = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) submit(question.type === 'numeric' ? { value: text.trim() } : { text: text.trim() })
  }
  const move = (i: number, d: -1 | 1) =>
    setOrder((o) => {
      const next = [...o]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })

  // Code-reading questions put the program after a blank line: show it as code, keeping lines and indentation.
  const [lead, ...rest] = question.prompt.split('\n\n')
  const program = rest.join('\n\n')
  const optionList = Array.isArray(question.options) ? (question.options as Opt[]) : []
  const correctIds = result ? (Array.isArray(result.correct_answer) ? (result.correct_answer as string[]) : typeof result.correct_answer === 'string' ? [result.correct_answer] : []) : []
  const choiceStyle = (id: string, isPicked: boolean) =>
    result && correctIds.includes(id) ? 'border-grass-dark bg-grass/30' : isPicked && result ? 'border-danger bg-danger/15' : isPicked ? 'border-wood-dark bg-gold/40' : 'border-wood/50 bg-white hover:border-wood'

  return (
    <div className="space-y-3 short:space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-full bg-water/40 px-2 py-0.5 text-ink">{t(`battle.subject.${question.subject}`, { defaultValue: question.subject })}</span>
        <span className="text-gold" aria-label={t('battle.difficulty', { n: question.difficulty })}>
          {'★'.repeat(question.difficulty)}
        </span>
        {question.status !== 'published' && <span className="rounded-full border-2 border-path-dark bg-path/40 px-2 py-0.5 text-ink">{t('battle.draft')}</span>}
      </div>
      <p className="font-display text-xl leading-snug font-semibold short:text-base short:leading-tight">{lead}</p>
      {program && (
        <pre dir="ltr" className="overflow-x-auto rounded-xl border-[3px] border-wood-dark bg-[#1f2433] p-3 text-start text-sm leading-relaxed text-[#f4f1ea]">
          <code>{program}</code>
        </pre>
      )}
      {question.type === 'multi_select' && <p className="text-sm font-semibold text-wood-dark">{t('battle.selectAll')}</p>}

      {(question.type === 'mcq' || question.type === 'true_false') && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(question.type === 'mcq' ? optionList : [{ id: 'true', text: t('battle.true') }, { id: 'false', text: t('battle.false') }]).map((o, i) =>
            hidden?.includes(o.id) ? null : (
            <button
              key={o.id}
              ref={i === 0 ? (el) => void (first.current = el) : undefined}
              type="button"
              disabled={locked}
              onClick={() => submit({ choice: o.id })}
              className={`flex min-h-12 items-center gap-2 rounded-2xl border-[3px] px-3 py-2 text-start font-semibold transition disabled:cursor-default short:min-h-9 short:rounded-xl short:border-2 short:py-0.5 short:text-sm ${choiceStyle(o.id, Boolean(chosen && 'choice' in chosen && chosen.choice === o.id))}`}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-wood text-sm text-cream short:size-6 short:text-xs">{question.type === 'mcq' ? String.fromCharCode(65 + i) : i ? '✗' : '✓'}</span>
              {o.text}
            </button>
          ))}
        </div>
      )}

      {question.type === 'multi_select' && (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {optionList.map((o, i) => {
              if (hidden?.includes(o.id)) return null
              const on = picked.includes(o.id)
              return (
                <button
                  key={o.id}
                  ref={i === 0 ? (el) => void (first.current = el) : undefined}
                  type="button"
                  aria-pressed={on}
                  disabled={locked}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== o.id) : [...p, o.id]))}
                  className={`flex min-h-12 items-center gap-2 rounded-2xl border-[3px] px-3 py-2 text-start font-semibold transition disabled:cursor-default short:min-h-9 short:rounded-xl short:border-2 short:py-0.5 short:text-sm ${choiceStyle(o.id, on)}`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-md border-2 border-wood-dark ${on ? 'bg-wood text-cream' : 'bg-white'}`}>{on && <Check size={14} aria-hidden />}</span>
                  {o.text}
                </button>
              )
            })}
          </div>
          {!result && (
            <Button onClick={() => submit({ choices: picked })} disabled={locked || picked.length === 0} className="short:sticky short:bottom-0">
              {t('battle.submit')}
            </Button>
          )}
        </div>
      )}

      {question.type === 'ordering' && (
        <div className="space-y-2">
          <ol className="space-y-2">
            {order.map((o, i) => (
              <li key={o.id} className="flex items-center gap-2 rounded-2xl border-[3px] border-wood/50 bg-white px-3 py-2 font-semibold short:rounded-xl short:border-2 short:py-0.5 short:text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-wood text-sm text-cream">{i + 1}</span>
                <span className="flex-1">{o.text}</span>
                <button ref={i === 0 ? (el) => void (first.current = el) : undefined} type="button" aria-label={t('battle.moveUp', { item: o.text })} disabled={locked || i === 0} onClick={() => move(i, -1)} className="rounded-lg border-2 border-wood/50 p-1 disabled:opacity-30">
                  <ArrowUp size={18} aria-hidden />
                </button>
                <button type="button" aria-label={t('battle.moveDown', { item: o.text })} disabled={locked || i === order.length - 1} onClick={() => move(i, 1)} className="rounded-lg border-2 border-wood/50 p-1 disabled:opacity-30">
                  <ArrowDown size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
          {!result && (
            <Button onClick={() => submit({ order: order.map((o) => o.id) })} disabled={locked} className="short:sticky short:bottom-0">
              {t('battle.submit')}
            </Button>
          )}
        </div>
      )}

      {question.type === 'matching' && (
        <div className="space-y-2">
          {(question.options as Pairs).left.map((l, i) => (
            <label key={l.id} className="flex flex-wrap items-center gap-2 rounded-2xl border-[3px] border-wood/50 bg-white px-3 py-2 font-semibold short:rounded-xl short:border-2 short:py-0.5 short:text-sm">
              <span className="min-w-24 flex-1">{l.text}</span>
              <select
                ref={i === 0 ? (el) => void (first.current = el) : undefined}
                value={pairs[l.id] ?? ''}
                disabled={locked}
                onChange={(e) => setPairs((p) => ({ ...p, [l.id]: e.target.value }))}
                className="min-h-10 min-w-36 rounded-lg border-2 border-wood/50 bg-cream px-2"
              >
                <option value="" disabled>
                  {t('battle.choose')}
                </option>
                {(question.options as Pairs).right.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.text}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {!result && (
            <Button onClick={() => submit({ pairs })} disabled={locked || Object.keys(pairs).length < (question.options as Pairs).left.length} className="short:sticky short:bottom-0">
              {t('battle.submit')}
            </Button>
          )}
        </div>
      )}

      {(question.type === 'numeric' || question.type === 'fill_blank' || question.type === 'short_answer') && (
        <form onSubmit={onText} className="flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl border-[3px] border-wood/60 bg-white px-3 focus-within:border-water-dark">
            <span className="sr-only">{t('battle.yourAnswer')}</span>
            <input
              ref={(el) => void (first.current = el)}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={locked}
              inputMode={question.type === 'numeric' ? 'decimal' : 'text'}
              autoComplete="off"
              className="min-h-12 w-full bg-transparent text-lg outline-none"
            />
            {question.unit && <span className="font-semibold text-wood-dark">{question.unit}</span>}
          </label>
          <Button type="submit" disabled={locked || !text.trim()}>
            {t('battle.submit')}
          </Button>
        </form>
      )}
      {busy && <p className="text-sm font-semibold text-wood-dark">{t('battle.checking')}</p>}

      {result && (
        <div aria-live="polite" className={`space-y-2 rounded-2xl border-[3px] p-3 ${result.correct ? 'border-grass-dark bg-grass/15' : 'border-path-dark bg-path/20'}`}>
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            {result.correct ? <Check className="text-grass-dark" aria-hidden /> : <X className="text-danger" aria-hidden />}
            {result.correct ? t('battle.correct') : t('battle.wrong')}
            {badge && <span className="ms-auto">{badge}</span>}
          </p>
          {!result.correct && <p className="font-semibold">{t('battle.correctAnswerIs', { answer: formatAnswer(question, result.correct_answer, t) })}</p>}
          {result.correct ? <p className="text-sm">{result.explanation}</p> : <WhyNot reason={result.wrong_reason} explanation={result.explanation} />}
          {children}
        </div>
      )}
    </div>
  )
}
