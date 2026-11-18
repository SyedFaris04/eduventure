import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Copy, GraduationCap, MessageCircle, Trash2, UserMinus } from 'lucide-react'
import { Button, buttonClasses, Field, Panel, Select } from '../../components/ui'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { FormMessage } from '../authentication/AuthLayout'
import { useSession } from '../authentication/useSession'
import { supabase } from '../../services/supabase'
import { whatsappLink } from '../parents/links'
import { saveReturnTo } from '../parents/pendingCode'

export type TeacherClass = { id: string; name: string; school: string | null; code: string; members: number }
export type CatalogTopic = { subject: string; topic: string; questions: number; curriculum: { system: string; subject: string; years: number[] } | null }
export type ClassReport = {
  quests: { id: string; subject: string; topic: string; tp: number | null; target: number; due_on: string; finished: number }[]
  students: { student_id: string; name: string | null; days: number; questions: number; correct: number; quests: { quest_id: string; progress: number }[] }[]
}
export type NewQuest = { subject: string; topic: string; tp: number | null; target: number; due: string }

type ViewProps = {
  session: 'none' | 'guest' | 'teacher'
  classes: TeacherClass[]
  selected: string | null
  report: ClassReport | undefined
  catalog: CatalogTopic[]
  busy: boolean
  onCreate: (name: string, school: string) => void
  onSelect: (id: string) => void
  onCreateQuest: (q: NewQuest) => void
  onDeleteQuest: (id: string) => void
  onRemoveStudent: (id: string) => void
  onArchive: (id: string) => void
}

const inAWeek = () => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)

/** The teacher page from plain values (TeacherPage wires it to the server). */
export function TeacherView(p: ViewProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [topic, setTopic] = useState('')
  const [tp, setTp] = useState('')
  const [target, setTarget] = useState('10')
  const [due, setDue] = useState(inAWeek)

  if (p.session === 'none')
    return (
      <Panel className="flex flex-col gap-3">
        <p>{t('teacher.intro')}</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/login" className={buttonClasses('primary', 'md')}>
            {t('teacher.login')}
          </Link>
          <Link to="/signup" className={buttonClasses('secondary', 'md')}>
            {t('teacher.createAccount')}
          </Link>
        </div>
      </Panel>
    )
  if (p.session === 'guest')
    return (
      <Panel>
        <p className="font-semibold">{t('teacher.guest')}</p>
      </Panel>
    )

  const cls = p.classes.find((c) => c.id === p.selected)
  const subjectName = (s: string) => t(`battle.subject.${s}`, { defaultValue: s })
  return (
    <div className="flex flex-col gap-5">
      <Panel className="flex flex-col gap-3">
        <p>{t('teacher.intro')}</p>
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            p.onCreate(name.trim(), school.trim())
            setName('')
          }}
        >
          <Field label={t('teacher.className')} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <Field label={t('teacher.school')} value={school} onChange={(e) => setSchool(e.target.value)} maxLength={80} />
          <Button type="submit" disabled={p.busy || name.trim().length < 2}>
            {t('teacher.create')}
          </Button>
        </form>
      </Panel>

      {p.classes.length > 0 && (
        <Panel className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold">{t('teacher.classes')}</h2>
          {p.classes.map((c) => (
            <div key={c.id} className={`flex flex-wrap items-center gap-2 rounded-xl border-2 p-2 ${c.id === p.selected ? 'border-grass-dark bg-grass/10' : 'border-wood/20 bg-white/80'}`}>
              <button type="button" onClick={() => p.onSelect(c.id)} aria-label={t('teacher.open', { name: c.name })} className="flex-1 text-start">
                <span className="font-semibold">{c.name}</span>
                {c.school && <span className="ms-1 text-xs text-wood-dark/70">· {c.school}</span>}
                <span className="ms-1 text-xs text-wood-dark/70">· {t('teacher.members', { n: c.members })}</span>
              </button>
              <span className="rounded bg-white px-2 font-mono font-bold tracking-widest">{c.code}</span>
              <a href={whatsappLink(t('teacher.whatsappText', { code: c.code, name: c.name }))} target="_blank" rel="noreferrer" className={buttonClasses('secondary', 'md', 'px-3!')} aria-label={t('teacher.whatsapp')}>
                <MessageCircle size={16} aria-hidden />
              </a>
              <Button variant="secondary" className="px-3!" aria-label={t('teacher.copy')} onClick={() => void navigator.clipboard?.writeText(c.code).catch(() => undefined)}>
                <Copy size={16} aria-hidden />
              </Button>
            </div>
          ))}
        </Panel>
      )}

      {cls && p.report && (
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">{cls.name}</h2>
            <Button variant="secondary" disabled={p.busy} onClick={() => p.onArchive(cls.id)}>
              <Archive size={16} aria-hidden /> {t('teacher.archive')}
            </Button>
          </div>

          <form
            className="grid gap-2 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const [subject, ...rest] = topic.split('|')
              p.onCreateQuest({ subject, topic: rest.join('|'), tp: tp ? Number(tp) : null, target: Number(target), due })
            }}
          >
            <p className="font-semibold sm:col-span-2">{t('teacher.newQuest')}</p>
            <Select label={t('teacher.topic')} value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">{t('teacher.chooseTopic')}</option>
              {p.catalog.map((c) => (
                <option key={`${c.subject}|${c.topic}`} value={`${c.subject}|${c.topic}`}>
                  {`${subjectName(c.subject)}: ${c.topic}${c.curriculum ? ` (${c.curriculum.system} ${c.curriculum.subject} ${c.curriculum.years.join('–')})` : ''}`}
                </option>
              ))}
            </Select>
            <Select label={t('teacher.tp')} value={tp} onChange={(e) => setTp(e.target.value)}>
              <option value="">{t('teacher.anyTp')}</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{`TP${n}+`}</option>
              ))}
            </Select>
            <Field label={t('teacher.target')} type="number" min={5} max={30} value={target} onChange={(e) => setTarget(e.target.value)} />
            <Field label={t('teacher.due')} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            <Button type="submit" disabled={p.busy || !topic} className="sm:col-span-2 sm:justify-self-start">
              {t('teacher.setQuest')}
            </Button>
          </form>

          {p.report.quests.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {p.report.quests.map((q) => (
                <li key={q.id} className="flex items-center gap-2">
                  <span className="font-semibold">{q.topic}</span>
                  <span className="text-wood-dark/70">
                    {q.tp ? `TP${q.tp}+ · ` : ''}
                    {t('teacher.questLine', { target: q.target, date: q.due_on, finished: q.finished, n: p.report!.students.length })}
                  </span>
                  <button type="button" onClick={() => p.onDeleteQuest(q.id)} aria-label={t('teacher.deleteQuest', { topic: q.topic })} className="ms-auto rounded p-1 hover:bg-wood/10">
                    <Trash2 size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="overflow-x-auto">
            <table aria-label={t('teacher.students')} className="w-full text-sm">
              <thead>
                <tr className="text-xs text-wood-dark/80">
                  <th className="pe-2 text-start font-semibold">{t('teacher.student')}</th>
                  <th className="pe-2 text-start font-semibold">{t('teacher.daysCol')}</th>
                  <th className="pe-2 text-start font-semibold">{t('teacher.rightCol')}</th>
                  {p.report.quests.map((q) => (
                    <th key={q.id} className="pe-2 text-start font-semibold">
                      {q.topic}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {p.report.students.length === 0 && (
                  <tr>
                    <td colSpan={4 + p.report.quests.length} className="py-2 text-wood-dark/70">
                      {t('teacher.noStudents', { code: cls.code })}
                    </td>
                  </tr>
                )}
                {p.report.students.map((s) => (
                  <tr key={s.student_id} className="border-t border-wood/15">
                    <td className="py-1 pe-2 font-semibold">{s.name ?? '—'}</td>
                    <td className="py-1 pe-2">{s.days}</td>
                    <td className="py-1 pe-2">{t('teacher.right', { correct: s.correct, n: s.questions })}</td>
                    {p.report!.quests.map((q) => {
                      const got = s.quests.find((x) => x.quest_id === q.id)?.progress ?? 0
                      return (
                        <td key={q.id} className={`py-1 pe-2 ${got >= q.target ? 'font-bold text-grass-dark' : ''}`}>
                          {`${Math.min(got, q.target)} / ${q.target}`}
                        </td>
                      )
                    })}
                    <td className="py-1">
                      <button type="button" onClick={() => p.onRemoveStudent(s.student_id)} aria-label={t('teacher.removeStudent', { name: s.name ?? '—' })} className="rounded p-1 hover:bg-wood/10">
                        <UserMinus size={14} aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-wood-dark/80">{t('teacher.privacy')}</p>
        </Panel>
      )}
    </div>
  )
}

type Rpc = PromiseLike<{ data: unknown; error: { message: string } | null }>

export function TeacherPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const kind = !session ? 'none' : session.user.is_anonymous ? 'guest' : 'teacher'
  const uid = session?.user.id
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  useEffect(() => {
    if (kind === 'none') saveReturnTo('/teacher')
  }, [kind])

  const rpc = async <T,>(fn: string, args?: Record<string, unknown>) => {
    const { data, error } = await supabase!.rpc(fn, args)
    if (error) throw error
    return data as T
  }
  const classes = useQuery({ queryKey: ['teacher-classes', uid], enabled: kind === 'teacher', queryFn: () => rpc<TeacherClass[]>('my_classes') })
  const catalog = useQuery({ queryKey: ['quest-catalog'], enabled: kind === 'teacher', queryFn: () => rpc<CatalogTopic[]>('quest_catalog') })
  const report = useQuery({ queryKey: ['class-report', selected], enabled: Boolean(selected), queryFn: () => rpc<ClassReport>('class_report', { p_class: selected }) })

  async function run(fn: () => Rpc, ok?: (d: unknown) => void) {
    setBusy(true)
    setMessage(null)
    const { data, error } = await fn()
    setBusy(false)
    if (error) {
      const m = error.message
      setMessage({ kind: 'error', text: t(/teacher account/i.test(m) ? 'teacher.errors.account' : /no questions/i.test(m) ? 'teacher.errors.noQuestions' : /due date/i.test(m) ? 'teacher.errors.due' : /between 5 and 30/i.test(m) ? 'teacher.errors.target' : 'teacher.errors.failed') })
      return
    }
    ok?.(data)
    await Promise.all(['teacher-classes', 'class-report'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })))
  }

  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6">
        <h1 className="flex items-center gap-2 self-start rounded-full bg-cream/90 px-4 py-1 text-2xl font-bold text-wood-dark">
          <GraduationCap aria-hidden /> {t('teacher.title')}
        </h1>
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
        <TeacherView
          session={kind}
          classes={classes.data ?? []}
          selected={selected}
          report={report.data}
          catalog={catalog.data ?? []}
          busy={busy}
          onCreate={(name, school) => void run(() => supabase!.rpc('create_class', { p_name: name, p_school: school || null }), (d) => setSelected((d as { id: string }).id))}
          onSelect={setSelected}
          onCreateQuest={(q) => void run(() => supabase!.rpc('create_quest', { p_class: selected, p_subject: q.subject, p_topic: q.topic, p_tp: q.tp, p_target: q.target, p_due: q.due }))}
          onDeleteQuest={(id) => void run(() => supabase!.rpc('delete_quest', { p_quest: id }))}
          onRemoveStudent={(id) => void run(() => supabase!.rpc('remove_student', { p_class: selected, p_student: id }))}
          onArchive={(id) =>
            void run(
              () => supabase!.rpc('archive_class', { p_class: id }),
              () => setSelected(null),
            )
          }
        />
      </div>
    </main>
  )
}
