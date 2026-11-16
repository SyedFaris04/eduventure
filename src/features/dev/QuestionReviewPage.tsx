import { useMemo, useState } from 'react'
import { Check, ClipboardCopy, Flag } from 'lucide-react'
import { Button, Panel } from '../../components/ui'
import bank from '../../../content/questions/starter.json'
import { questionSource, type QuestionSource } from '../battle/questionSchema'

// Development-only page (the route is not registered in production builds): it shows answer keys.
// English only by design; it is an internal review tool, not part of the game.
const STORAGE = 'eduventure.questionReview'
type Review = Record<string, { approved: boolean; note: string }>

const load = (): Review => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) ?? '{}')
  } catch {
    return {}
  }
}

export function QuestionReviewPage() {
  const questions = useMemo(() => bank.questions.map((q) => questionSource.parse(q)), [])
  const [review, setReview] = useState<Review>(load)
  const [copied, setCopied] = useState(false)
  const update = (id: string, patch: Partial<Review[string]>) =>
    setReview((r) => {
      const next = { ...r, [id]: { ...(r[id] ?? { approved: false, note: '' }), ...patch } }
      try {
        localStorage.setItem(STORAGE, JSON.stringify(next))
      } catch {
        // storage blocked: the summary still works for this visit
      }
      return next
    })

  const approved = questions.filter((q) => review[q.id]?.approved).map((q) => q.id)
  const flagged = Object.fromEntries(questions.filter((q) => review[q.id]?.note?.trim()).map((q) => [q.id, review[q.id].note.trim()]))
  const summary = JSON.stringify({ approved, flagged }, null, 2)

  const groups = Object.entries(
    questions.reduce<Record<string, QuestionSource[]>>((acc, q) => {
      const key = q.level_ids.length > 1 ? 'General (all levels)' : `${q.level_ids[0].replace('_', ' ')} · ${q.subject}`
      ;(acc[key] ??= []).push(q)
      return acc
    }, {}),
  )

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-wood-dark">Starter question review</h1>
          <p className="text-sm text-ink/75">
            {questions.length} questions · {approved.length} approved · {Object.keys(flagged).length} with notes. Tick each question you approve, add a note to any that needs changing, then copy the summary.
          </p>
        </div>
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(summary)
            setCopied(true)
          }}
        >
          <ClipboardCopy size={18} aria-hidden /> {copied ? 'Copied' : 'Copy review summary'}
        </Button>
      </header>

      {groups.map(([group, qs]) => (
        <Panel key={group} title={group} className="flex flex-col gap-4">
          {qs.map((q) => {
            const r = review[q.id]
            return (
              <article key={q.id} className={`rounded-2xl border-[3px] bg-white p-4 ${r?.approved ? 'border-grass-dark' : r?.note ? 'border-path-dark' : 'border-wood/30'}`}>
                <p className="text-xs font-bold text-wood-dark">
                  {q.id} · {q.topic} › {q.subtopic} · difficulty {q.difficulty} · {q.bloom} · {q.type}
                </p>
                <p className="mt-1 font-display text-lg font-semibold">{q.prompt}</p>
                {q.type === 'mcq' && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((o) => (
                      <li key={o.id} className={o.id === q.answer ? 'font-bold text-grass-dark' : ''}>
                        {o.id.toUpperCase()}. {o.text} {o.id === q.answer ? '✓' : <span className="font-normal text-ink/70">— {q.wrong[o.id]}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {q.type === 'true_false' && (
                  <p className="mt-2 text-sm">
                    <strong className="text-grass-dark">Answer: {q.answer}</strong> — if they choose {q.answer === 'true' ? 'false' : 'true'}: {q.wrong[q.answer === 'true' ? 'false' : 'true']}
                  </p>
                )}
                {q.type === 'numeric' && (
                  <p className="mt-2 text-sm">
                    <strong className="text-grass-dark">
                      Answer: {q.answer.value} {q.answer.unit ?? ''}
                    </strong>
                    {q.answer.tolerance ? ` (± ${q.answer.tolerance})` : ''}
                    {q.mistakes?.map((m) => (
                      <span key={m.value} className="block text-ink/70">
                        If they answer {m.value}: {m.why}
                      </span>
                    ))}
                  </p>
                )}
                {q.type === 'fill_blank' && <p className="mt-2 text-sm font-bold text-grass-dark">Accepts: {q.answer.accept.join(', ')}</p>}
                <p className="mt-2 text-sm">
                  <strong>Explanation:</strong> {q.explanation}
                </p>
                <p className="mt-1 text-xs text-ink/70">
                  <strong>Objective:</strong> {q.objective} · <strong>Alignment:</strong> {q.alignment}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={Boolean(r?.approved)} onChange={(e) => update(q.id, { approved: e.target.checked })} className="size-5 accent-grass-dark" />
                    <Check size={16} aria-hidden /> Approve
                  </label>
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <Flag size={16} aria-hidden className="text-path-dark" />
                    <span className="sr-only">Note for {q.id}</span>
                    <input
                      value={r?.note ?? ''}
                      onChange={(e) => update(q.id, { note: e.target.value })}
                      placeholder="Note (what should change?)"
                      className="min-h-9 flex-1 rounded-lg border-2 border-wood/40 px-2"
                    />
                  </label>
                </div>
              </article>
            )
          })}
        </Panel>
      ))}
    </main>
  )
}
