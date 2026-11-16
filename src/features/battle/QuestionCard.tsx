import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { Button } from '../../components/ui'
import type { AnswerPayload, AnswerResult } from './battleApi'
import type { PublicQuestion } from './questionSchema'

export type Marked = Pick<AnswerResult, 'correct' | 'correct_answer' | 'explanation' | 'wrong_reason'>

/**
 * One question with its answer controls and, once marked, the feedback. Shared by monster battles and
 * the boss. Remount it (key = question id) for each new question.
 */
export function QuestionCard({ question, busy, result, onSubmit, badge, children }: { question: PublicQuestion; busy: boolean; result: Marked | null; onSubmit: (a: AnswerPayload) => void; badge?: ReactNode; children?: ReactNode }) {
  const { t } = useTranslation()
  const [chosen, setChosen] = useState<AnswerPayload | null>(null)
  const [text, setText] = useState('')
  const first = useRef<HTMLButtonElement | HTMLInputElement | null>(null)

  useEffect(() => {
    if (!result) first.current?.focus()
  }, [result])

  const submit = (a: AnswerPayload) => {
    if (busy || result) return
    setChosen(a)
    onSubmit(a)
  }
  const onText = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) submit(question.type === 'numeric' ? { value: text.trim() } : { text: text.trim() })
  }
  const answerText = (r: Marked) => {
    const a = r.correct_answer
    if (typeof a === 'string') return question.type === 'true_false' ? t(`battle.${a}`) : (question.options?.find((o) => o.id === a)?.text ?? a)
    if ('value' in a) return `${a.value}${a.unit ? ` ${a.unit}` : ''}`
    return a.accept[0]
  }
  const choices = question.type === 'mcq' ? question.options! : [{ id: 'true', text: t('battle.true') }, { id: 'false', text: t('battle.false') }]

  return (
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
          {choices.map((o, i) => {
            const picked = chosen && 'choice' in chosen && chosen.choice === o.id
            const isRight = result && typeof result.correct_answer === 'string' && result.correct_answer === o.id
            return (
              <button
                key={o.id}
                ref={i === 0 ? (el) => void (first.current = el) : undefined}
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
              ref={(el) => void (first.current = el)}
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

      {result && (
        <div aria-live="polite" className={`space-y-2 rounded-2xl border-[3px] p-3 ${result.correct ? 'border-grass-dark bg-grass/15' : 'border-path-dark bg-path/20'}`}>
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            {result.correct ? <Check className="text-grass-dark" aria-hidden /> : <X className="text-danger" aria-hidden />}
            {result.correct ? t('battle.correct') : t('battle.wrong')}
            {badge && <span className="ms-auto">{badge}</span>}
          </p>
          {!result.correct && <p className="font-semibold">{t('battle.correctAnswerIs', { answer: answerText(result) })}</p>}
          {result.wrong_reason && <p className="text-sm">{result.wrong_reason}</p>}
          <p className="text-sm">{result.explanation}</p>
          {children}
        </div>
      )}
    </div>
  )
}
