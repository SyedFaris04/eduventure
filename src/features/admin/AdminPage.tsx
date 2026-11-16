import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CheckCheck, Search, X } from 'lucide-react'
import { Button, buttonClasses, Panel } from '../../components/ui'
import { useSession } from '../authentication/useSession'
import { formatAnswer } from '../battle/QuestionCard'
import type { PublicQuestion } from '../battle/questionSchema'
import { allowedActions, bulkReview, findDuplicates, reviewQuestion, useHistory, useMyRoles, useQuestionBank, type Action, type AdminQuestion, type Status } from './review'

// Admin area: English-only for now (decision #19); translated before outside educators are invited.
const STATUSES: Status[] = ['draft', 'in_review', 'approved', 'published', 'rejected']
const STATUS_STYLE: Record<Status, string> = {
  draft: 'bg-wood/15 text-wood-dark',
  in_review: 'bg-gold/40 text-ink',
  approved: 'bg-water/40 text-ink',
  published: 'bg-grass/40 text-ink',
  rejected: 'bg-danger/20 text-ink',
}
const ACTION_LABEL: Record<Action, string> = {
  submit: 'Submit for review',
  approve: 'Approve',
  reject: 'Reject',
  request_changes: 'Send back to draft',
  publish: 'Publish',
  unpublish: 'Unpublish',
}
const label = (s: string) => s.replace(/_/g, ' ')

export function AdminPage() {
  const { session, loading } = useSession()
  const roles = useMyRoles(session?.user.id)
  const isReviewer = Boolean(roles.data?.some((r) => r === 'admin' || r === 'educator'))
  const isAdmin = Boolean(roles.data?.includes('admin'))
  const bank = useQuestionBank(isReviewer)
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<Status | 'all'>('in_review')
  const [level, setLevel] = useState('all')
  const [subject, setSubject] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const questions = useMemo(() => bank.data ?? [], [bank.data])
  const duplicates = useMemo(() => findDuplicates(questions), [questions])
  const levels = useMemo(() => [...new Set(questions.flatMap((q) => (q.level_ids.length > 3 ? ['all levels'] : q.level_ids)))].sort(), [questions])
  const subjects = useMemo(() => [...new Set(questions.map((q) => q.subject_id))].sort(), [questions])
  const visible = questions.filter(
    (q) =>
      (status === 'all' || q.status === status) &&
      (level === 'all' || (level === 'all levels' ? q.level_ids.length > 3 : q.level_ids.includes(level))) &&
      (subject === 'all' || q.subject_id === subject) &&
      (!search.trim() || `${q.id} ${q.prompt} ${q.topic}`.toLowerCase().includes(search.trim().toLowerCase())),
  )

  if (!loading && !session) return <Navigate to="/login" replace />
  if (roles.isPending || (isReviewer && bank.isPending)) return <p className="p-8 font-display">Loading…</p>
  if (!isReviewer)
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <Panel title="Question review" className="max-w-md text-center">
          <p>This area is for educators and admins. Ask an admin to give your account a reviewer role.</p>
          <Link to="/home" className={buttonClasses('secondary', 'md', 'mt-4')}>
            Back to Home
          </Link>
        </Panel>
      </main>
    )

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['admin'] })])
  const runBulk = async (actions: Action[]) => {
    setBusy(true)
    setMessage(null)
    try {
      const ids = [...selected]
      let done = 0
      const skipped: string[] = []
      for (const a of actions) {
        const r = await bulkReview(ids, a, note || null)
        done = r.done
        skipped.push(...r.skipped.map((s) => `${s.id}: ${s.reason}`))
      }
      setMessage(`${done} question(s) updated.${skipped.length ? ` Skipped: ${skipped.join('; ')}` : ''}`)
      setSelected(new Set())
      setNote('')
      await refresh()
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const toggle = (id: string) => setSelected((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])))
  const current = questions.find((q) => q.id === open) ?? null

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/home" className={buttonClasses('secondary', 'md', 'px-3!')} aria-label="Back to Home">
            <ArrowLeft size={18} aria-hidden />
          </Link>
          <h1 className="text-3xl font-bold text-wood-dark">Question review</h1>
        </div>
        <p className="text-sm text-ink/70">{isAdmin ? 'Admin' : 'Educator'} · {questions.length} questions</p>
      </header>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {(['all', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${status === s ? 'border-wood-dark bg-wood text-cream' : 'border-wood/40 bg-white'}`}
          >
            {label(s)} ({s === 'all' ? questions.length : questions.filter((q) => q.status === s).length})
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap gap-2">
        <select aria-label="Level" value={level} onChange={(e) => setLevel(e.target.value)} className="min-h-10 rounded-xl border-2 border-wood/50 bg-white px-2">
          <option value="all">All levels</option>
          {levels.map((l) => (
            <option key={l} value={l}>
              {label(l)}
            </option>
          ))}
        </select>
        <select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-10 rounded-xl border-2 border-wood/50 bg-white px-2">
          <option value="all">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
        <label className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border-2 border-wood/50 bg-white px-2">
          <Search size={16} aria-hidden />
          <span className="sr-only">Search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search id, prompt or topic" className="min-h-10 flex-1 bg-transparent outline-none" />
        </label>
      </div>

      {message && (
        <p role="status" className="rounded-xl border-2 border-water-dark bg-water/20 p-2 text-sm font-semibold">
          {message}
        </p>
      )}

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border-[3px] border-wood bg-cream p-3 shadow-[0_4px_0_var(--color-wood-dark)]">
          <strong className="text-sm">{selected.size} selected</strong>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for the history" className="min-h-10 flex-1 rounded-lg border-2 border-wood/40 px-2" />
          <Button onClick={() => void runBulk(['approve'])} disabled={busy}>
            Approve
          </Button>
          {isAdmin && (
            <Button onClick={() => void runBulk(['approve', 'publish'])} disabled={busy}>
              <CheckCheck size={18} aria-hidden /> Approve & publish
            </Button>
          )}
          <Button variant="secondary" onClick={() => void runBulk(['reject'])} disabled={busy}>
            Reject
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border-[3px] border-wood/50 bg-white">
        <div className="flex items-center gap-3 border-b-2 border-wood/20 bg-cream px-3 py-2 text-sm font-bold">
          <input
            type="checkbox"
            aria-label="Select all shown"
            className="size-5 accent-grass-dark"
            checked={visible.length > 0 && visible.every((q) => selected.has(q.id))}
            onChange={(e) => setSelected(e.target.checked ? new Set([...selected, ...visible.map((q) => q.id)]) : new Set([...selected].filter((id) => !visible.some((q) => q.id === id))))}
          />
          {visible.length} shown
        </div>
        <ul>
          {visible.map((q) => (
            <li key={q.id} className="flex items-start gap-3 border-b border-wood/10 px-3 py-2 last:border-0">
              <input type="checkbox" aria-label={`Select ${q.id}`} checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="mt-1 size-5 shrink-0 accent-grass-dark" />
              <button type="button" onClick={() => setOpen(q.id)} className="min-w-0 flex-1 text-start">
                <span className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="text-wood-dark">{q.id}</span>
                  <span className={`rounded-full px-2 ${STATUS_STYLE[q.status]}`}>{label(q.status)}</span>
                  <span className="text-ink/60">
                    {label(q.subject_id)} · {q.type} · {'★'.repeat(q.difficulty)}
                  </span>
                  {q.stats && (
                    <span className="text-ink/60">
                      {q.stats.attempts} tries · {Math.round((q.stats.correct / q.stats.attempts) * 100)}% correct
                    </span>
                  )}
                  {duplicates[q.id] && (
                    <span className="flex items-center gap-1 text-danger">
                      <AlertTriangle size={14} aria-hidden /> same as {duplicates[q.id].join(', ')}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate">{q.prompt}</span>
              </button>
            </li>
          ))}
          {!visible.length && <li className="p-6 text-center text-ink/60">No questions match these filters.</li>}
        </ul>
      </div>

      {current && <Detail q={current} isAdmin={isAdmin} onClose={() => setOpen(null)} onChanged={refresh} />}
    </main>
  )
}

function Detail({ q, isAdmin, onClose, onChanged }: { q: AdminQuestion; isAdmin: boolean; onClose: () => void; onChanged: () => Promise<unknown> }) {
  const history = useHistory(q.id)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const act = async (a: Action) => {
    setBusy(true)
    setError(null)
    try {
      await reviewQuestion(q.id, a, note || null)
      setNote('')
      await Promise.all([onChanged(), history.refetch()])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const answer = q.key?.answer as string | { value: number; unit?: string; tolerance: number } | { accept: string[] } | undefined

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-ink/40" onClick={onClose}>
      <aside role="dialog" aria-label={`Question ${q.id}`} onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto border-s-4 border-wood bg-cream p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold text-wood-dark">
            {q.id} · v{q.version} · <span className={`rounded-full px-2 ${STATUS_STYLE[q.status]}`}>{label(q.status)}</span>
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-wood/10">
            <X size={20} aria-hidden />
          </button>
        </div>
        <h2 className="mt-2 text-xl font-semibold">{q.prompt}</h2>
        <p className="mt-1 text-xs text-ink/70">
          {q.level_ids.map(label).join(', ')} · {label(q.subject_id)} · {q.topic} › {q.subtopic} · difficulty {q.difficulty} · {q.bloom} · {q.type}
        </p>

        <section className="mt-4 space-y-1 text-sm">
          {['multi_select', 'ordering', 'matching', 'short_answer'].includes(q.type) && (
            <p className="font-bold text-grass-dark">Answer: {formatAnswer({ type: q.type as PublicQuestion['type'], options: q.options as PublicQuestion['options'], unit: q.unit }, answer, (k) => k)}</p>
          )}
          {q.type === 'mcq' && Array.isArray(q.options) && q.options.map((o) => (
            <p key={o.id} className={o.id === answer ? 'font-bold text-grass-dark' : ''}>
              {o.id.toUpperCase()}. {o.text} {o.id === answer ? '✓' : <span className="font-normal text-ink/70">— {q.key?.wrong?.[o.id]}</span>}
            </p>
          ))}
          {q.type === 'true_false' && typeof answer === 'string' && (
            <p>
              <strong className="text-grass-dark">Answer: {answer}</strong> — otherwise: {q.key?.wrong?.[answer === 'true' ? 'false' : 'true']}
            </p>
          )}
          {answer && typeof answer === 'object' && 'value' in answer && (
            <p className="font-bold text-grass-dark">
              Answer: {answer.value} {answer.unit ?? ''} {answer.tolerance ? `(± ${answer.tolerance})` : ''}
            </p>
          )}
          {q.key?.mistakes?.map((m) => (
            <p key={m.value} className="text-ink/70">
              If {m.value}: {m.why}
            </p>
          ))}
          {answer && typeof answer === 'object' && 'accept' in answer && <p className="font-bold text-grass-dark">Accepts: {answer.accept.join(', ')}</p>}
          <p className="pt-2">
            <strong>Explanation:</strong> {q.key?.explanation}
          </p>
        </section>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="font-bold">Objective</dt>
          <dd>{q.objective}</dd>
          <dt className="font-bold">Alignment</dt>
          <dd>{q.alignment}</dd>
          <dt className="font-bold">Source</dt>
          <dd>
            {q.source_name} · {q.license} · {q.verification}
          </dd>
          {q.stats && (
            <>
              <dt className="font-bold">Results</dt>
              <dd>
                {q.stats.correct} of {q.stats.attempts} correct
              </dd>
            </>
          )}
        </dl>

        <section className="mt-5 space-y-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (saved in the history)" rows={2} className="w-full rounded-xl border-2 border-wood/50 p-2" />
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {allowedActions(q.status, isAdmin).map((a) => (
              <Button key={a} variant={a === 'approve' || a === 'publish' ? 'primary' : 'secondary'} onClick={() => void act(a)} disabled={busy}>
                {ACTION_LABEL[a]}
              </Button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="font-display text-lg font-semibold">History</h3>
          <ol className="mt-2 space-y-2 text-sm">
            {history.data?.map((h) => (
              <li key={h.id} className="rounded-lg bg-white p-2">
                <strong>{ACTION_LABEL[h.action]}</strong> · {label(h.from_status)} → {label(h.to_status)} · v{h.version} · {new Date(h.created_at).toLocaleString()}
                {h.note && <span className="block text-ink/75">“{h.note}”</span>}
              </li>
            ))}
            {history.data?.length === 0 && <li className="text-ink/60">No review actions yet.</li>}
          </ol>
        </section>
      </aside>
    </div>
  )
}
