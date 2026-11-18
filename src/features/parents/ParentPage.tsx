import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Smartphone, Target, ThumbsUp, Users } from 'lucide-react'
import { Button, buttonClasses, Field, Panel, Select } from '../../components/ui'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { FormMessage } from '../authentication/AuthLayout'
import { useSession } from '../authentication/useSession'
import { supabase } from '../../services/supabase'
import { peekPendingCode, savePendingCode, takePendingCode } from './pendingCode'

export type Kid = { child_id: string; name: string | null; daily_limit: number | null }
export type TopicTp = { subject: string; topic: string; answers: number; tp: number | null }
export type Report = { week: { day: string; minutes: number; played: boolean }[]; questions: number; correct: number; lessons: number; strong: string[]; practise: string[]; streak: number; topics?: TopicTp[] }
const LIMITS = [30, 60, 90, 120]

type ViewProps = {
  session: 'none' | 'guest' | 'parent'
  code: string
  kids: Kid[]
  reports: Record<string, Report | undefined>
  busy: boolean
  onApprove: (code: string) => void
  onSetLimit: (child: string, minutes: number | null) => void
  onRemove: (child: string) => void
}

/** The parent page from plain values (ParentPage wires it to the server). */
export function ParentView({ session, code, kids, reports, busy, onApprove, onSetLimit, onRemove }: ViewProps) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState(code)
  const [sure, setSure] = useState(false)
  useEffect(() => setTyped(code), [code])

  if (session === 'none')
    return (
      <Panel className="flex flex-col gap-3">
        <p>{t('parents.intro')}</p>
        {code && (
          <p className="font-semibold">
            {t('parents.codeLabel')}: <span className="font-mono">{code}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link to="/login" className={buttonClasses('primary', 'md')}>
            {t('parents.login')}
          </Link>
          <Link to="/signup" className={buttonClasses('secondary', 'md')}>
            {t('parents.createAccount')}
          </Link>
        </div>
      </Panel>
    )

  // A guest session means this is the child's own phone: never sign it out (the child's progress would be lost).
  if (session === 'guest')
    return (
      <Panel className="flex items-start gap-3">
        <Smartphone size={32} className="shrink-0 text-water-dark" aria-hidden />
        <p className="font-semibold">{t('parents.guestDevice')}</p>
      </Panel>
    )

  return (
    <div className="flex flex-col gap-5">
      <Panel className="flex flex-col gap-3">
        <p>{t('parents.intro')}</p>
        <Field label={t('parents.codeLabel')} value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />
        <label className="flex items-start gap-2 text-sm font-semibold">
          <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-1 size-5" />
          {t('parents.confirm')}
        </label>
        <Button onClick={() => onApprove(typed.trim())} disabled={busy || !sure || !typed.trim()} className="self-start">
          <ShieldCheck size={18} aria-hidden /> {t('parents.approve')}
        </Button>
      </Panel>

      <Panel className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Users aria-hidden /> {t('parents.children')}
        </h2>
        {kids.length === 0 && <p className="text-sm">{t('parents.noChildren')}</p>}
        {kids.map((k) => {
          const r = reports[k.child_id]
          return (
            <article key={k.child_id} className="flex flex-col gap-2 rounded-2xl border-[3px] border-wood/30 bg-white/85 p-3">
              <h3 className="font-display text-lg font-bold">{k.name ?? '—'}</h3>
              {r && (
                <div className="grid gap-1 text-sm">
                  <p className="font-semibold">{t('parents.week')}</p>
                  <p>
                    {t('parents.reportDays', { n: r.week.filter((d) => d.played).length })} · {t('parents.reportStreak', { n: r.streak })}
                  </p>
                  <p>{t('parents.reportQuestions', { correct: r.correct, n: r.questions })}</p>
                  <p>{t('parents.reportLessons', { n: r.lessons })}</p>
                  <p className="flex flex-wrap items-center gap-1">
                    <ThumbsUp size={14} className="text-grass-dark" aria-hidden /> {t('parents.strong')}:{' '}
                    {r.strong.length
                      ? r.strong.map((s) => (
                          <span key={s} className="rounded bg-grass/20 px-1">
                            {s}
                          </span>
                        ))
                      : t('parents.nothingYet')}
                  </p>
                  <p className="flex flex-wrap items-center gap-1">
                    <Target size={14} className="text-path-dark" aria-hidden /> {t('parents.practise')}:{' '}
                    {r.practise.length
                      ? r.practise.map((s) => (
                          <span key={s} className="rounded bg-path/25 px-1">
                            {s}
                          </span>
                        ))
                      : t('parents.nothingYet')}
                  </p>
                  {r.topics && r.topics.length > 0 && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-start text-sm">
                        <caption className="text-start font-semibold">{t('parents.topics')}</caption>
                        <thead>
                          <tr className="text-xs text-wood-dark/80">
                            <th className="pe-2 text-start font-semibold">{t('parents.topicCol')}</th>
                            <th className="pe-2 text-start font-semibold">{t('parents.tpCol')}</th>
                            <th className="text-start font-semibold">{t('parents.answersCol')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.topics.map((tp) => (
                            <tr key={`${tp.subject}/${tp.topic}`} className="border-t border-wood/15">
                              <td className="py-1 pe-2">
                                <span className="block">{tp.topic}</span>
                                <span className="text-xs text-wood-dark/70">{t(`battle.subject.${tp.subject}`, { defaultValue: tp.subject })}</span>
                              </td>
                              <td className="py-1 pe-2 font-bold">{tp.tp ? t('parents.tpValue', { n: tp.tp }) : <span className="font-normal text-wood-dark/70">{t('parents.notEnough')}</span>}</td>
                              <td className="py-1">{tp.answers}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-1 text-xs text-wood-dark/80">{t('parents.tpNote')}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <Select label={t('parents.limit')} value={k.daily_limit ?? ''} disabled={busy} onChange={(e) => onSetLimit(k.child_id, e.target.value ? Number(e.target.value) : null)}>
                  <option value="">{t('parents.noLimit')}</option>
                  {LIMITS.map((m) => (
                    <option key={m} value={m}>
                      {t('parents.minutesOption', { n: m })}
                    </option>
                  ))}
                </Select>
                <Button variant="secondary" disabled={busy} onClick={() => onRemove(k.child_id)}>
                  {t('parents.remove')}
                </Button>
              </div>
            </article>
          )
        })}
      </Panel>
    </div>
  )
}

const ERRORS: [RegExp, string][] = [
  [/not valid/i, 'notValid'],
  [/confirm/i, 'confirm'],
  [/18 or older/i, 'adult'],
  [/already has a parent/i, 'already'],
  [/parent account/i, 'parentAccount'],
  [/your own account/i, 'own'],
]
type Rpc = PromiseLike<{ data: unknown; error: { message: string } | null }>

export function ParentPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const urlCode = params.get('code')
  useEffect(() => {
    if (urlCode) savePendingCode(urlCode)
  }, [urlCode])
  const code = urlCode ?? peekPendingCode() ?? ''
  const kind = !session ? 'none' : session.user.is_anonymous ? 'guest' : 'parent'
  const uid = session?.user.id

  const kids = useQuery({
    queryKey: ['children', uid],
    enabled: kind === 'parent',
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_children')
      if (error) throw error
      return data as Kid[]
    },
  })
  const reports = useQueries({
    queries: (kids.data ?? []).map((k) => ({
      queryKey: ['child-report', k.child_id],
      queryFn: async () => {
        const { data, error } = await supabase!.rpc('child_report', { p_child: k.child_id })
        if (error) throw error
        return data as Report
      },
    })),
  })

  async function run(fn: () => Rpc, ok?: (data: unknown) => string) {
    setBusy(true)
    setMessage(null)
    const { data, error } = await fn()
    setBusy(false)
    if (error) {
      const key = ERRORS.find(([re]) => re.test(error.message))?.[1] ?? 'failed'
      setMessage({ kind: 'error', text: t(`parents.errors.${key}`) })
      return
    }
    if (ok) setMessage({ kind: 'success', text: ok(data) })
    await queryClient.invalidateQueries({ queryKey: ['children', uid] })
    await queryClient.invalidateQueries({ queryKey: ['child-report'] })
  }

  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
        <h1 className="flex items-center gap-2 self-start rounded-full bg-cream/90 px-4 py-1 text-2xl font-bold text-wood-dark">
          <ShieldCheck aria-hidden /> {t('parents.title')}
        </h1>
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
        <ParentView
          session={kind}
          code={code}
          kids={kids.data ?? []}
          reports={Object.fromEntries((kids.data ?? []).map((k, i) => [k.child_id, reports[i]?.data]))}
          busy={busy}
          onApprove={(c) =>
            void run(
              () => supabase!.rpc('approve_child', { p_code: c, p_confirm: true }),
              (d) => {
                takePendingCode()
                return t('parents.approvedOk', { name: (d as { child_name: string | null }).child_name ?? '—' })
              },
            )
          }
          onSetLimit={(child, minutes) => void run(() => supabase!.rpc('set_child_limit', { p_child: child, p_minutes: minutes }))}
          onRemove={(child) => void run(() => supabase!.rpc('remove_child', { p_child: child }))}
        />
      </div>
    </main>
  )
}
