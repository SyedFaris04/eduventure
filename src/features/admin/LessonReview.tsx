import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui'
import { allowedActions, reviewLesson, useLessonBank, type Action, type AdminLesson } from './review'

const ACTION_LABEL: Record<Action, string> = { submit: 'Submit', approve: 'Approve', reject: 'Reject', request_changes: 'Request changes', publish: 'Publish', unpublish: 'Unpublish' }
const STATUS_STYLE: Record<string, string> = { draft: 'bg-wood/20', in_review: 'bg-path/40', approved: 'bg-water/40', published: 'bg-grass/40', rejected: 'bg-danger/20' }

/** Staff tool (English only, like question review): read each lesson with its answers, then approve or publish it. */
export function LessonReview({ isAdmin }: { isAdmin: boolean }) {
  const lessons = useLessonBank(true)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function act(ids: string[], action: Action) {
    setBusy(true)
    setMessage(null)
    const failed: string[] = []
    for (const id of ids) await reviewLesson(id, action).catch((e: Error) => failed.push(`${id}: ${e.message}`))
    await queryClient.invalidateQueries({ queryKey: ['admin', 'lessons'] })
    setMessage(failed.length ? `Some lessons were skipped: ${failed.join('; ')}` : `${ACTION_LABEL[action]}: ${ids.length} lesson(s)`)
    setBusy(false)
  }

  if (lessons.isError) return <p role="alert">Couldn't load lessons.</p>
  if (!lessons.data) return <p>Loading…</p>
  const units = new Map<string, AdminLesson[]>()
  for (const l of lessons.data) units.set(`${l.course_id} · Unit ${l.unit_index}: ${l.unit_title}`, [...(units.get(`${l.course_id} · Unit ${l.unit_index}: ${l.unit_title}`) ?? []), l])

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <p role="status" className="rounded-xl border-2 border-wood/40 bg-white p-2 text-sm font-semibold">
          {message}
        </p>
      )}
      {[...units].map(([unit, list]) => {
        const waiting = list.filter((l) => l.status === 'in_review').map((l) => l.id)
        return (
          <section key={unit} className="rounded-2xl border-[3px] border-wood/40 bg-cream p-3">
            <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-wood-dark">{unit}</h2>
              {waiting.length > 0 && (
                <Button variant="secondary" disabled={busy} onClick={() => void act(waiting, 'approve')}>
                  Approve unit ({waiting.length})
                </Button>
              )}
            </header>
            <ul className="flex flex-col gap-2">
              {list.map((l) => (
                <li key={l.id} className="rounded-xl border-2 border-wood/30 bg-white p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id} className="flex-1 text-start font-semibold">
                      {l.id} · {l.title}
                    </button>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[l.status] ?? ''}`}>{l.status.replace('_', ' ')}</span>
                    {allowedActions(l.status, isAdmin).map((a) => (
                      <Button key={a} variant={a === 'approve' || a === 'publish' ? 'primary' : 'secondary'} disabled={busy} onClick={() => void act([l.id], a)}>
                        {ACTION_LABEL[a]}
                      </Button>
                    ))}
                  </div>
                  {open === l.id && (
                    <ol className="mt-2 flex flex-col gap-2 text-sm">
                      <li className="text-ink/70">Objective: {l.objective} · version {l.version}</li>
                      {l.steps.map((s) => (
                        <li key={s.id} className="rounded-lg border border-wood/20 p-2">
                          <p className="font-bold">
                            {s.step_index}. {s.kind}: {s.text}
                          </p>
                          {(s.code || s.starter) && <pre className="mt-1 overflow-x-auto rounded bg-[#1f2433] p-2 text-xs text-[#f4f1ea]">{s.code ?? s.starter}</pre>}
                          {s.options && <p>Options: {s.options.map((o) => `${o.id}) ${o.text}`).join('   ')}</p>}
                          {s.broken_line && <p>Broken line: {s.broken_line}</p>}
                          {s.expected_output && <p className="whitespace-pre-wrap">Expected output: {s.expected_output}</p>}
                          {s.key && (s.key.answer ?? s.key.solution) != null && (
                            <p className="text-grass-dark">
                              Answer: {JSON.stringify(s.key.answer ?? s.key.solution)}
                              {s.key.explanation ? ` — ${s.key.explanation}` : ''}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
