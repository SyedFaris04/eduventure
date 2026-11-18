import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, GraduationCap, LogOut, MapPin } from 'lucide-react'
import { Button, Field } from '../../components/ui'
import { supabase } from '../../services/supabase'
import { useGuardian } from '../parents/useGuardian'

export type StudentQuest = { id: string; subject: string; topic: string; tp: number | null; target: number; due_on: string; island: string; progress: number }
export type StudentClass = { class_id: string; name: string; school: string | null; quests: StudentQuest[] }

type Props = { classes: StudentClass[]; canJoin: boolean; busy: boolean; error?: string | null; onJoin: (code: string) => void; onLeave: (classId: string) => void }

/** Home card: the player's classes and their quests; join with a code (under-18s once a parent has approved). */
export function MyClassesCard({ classes, canJoin, busy, error, onJoin, onLeave }: Props) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-wood/30 bg-white/70 p-3 text-sm">
      <p className="flex items-center gap-2 font-display text-base font-semibold">
        <GraduationCap size={18} aria-hidden /> {t('classes.title')}
      </p>
      {classes.map((c) => (
        <div key={c.class_id} className="flex flex-col gap-1 rounded-lg bg-cream/80 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">
              <span>{c.name}</span>
              {c.school && <span className="ms-1 text-xs font-normal text-wood-dark/70">· {c.school}</span>}
            </p>
            <button type="button" onClick={() => onLeave(c.class_id)} disabled={busy} aria-label={t('classes.leaveClass', { name: c.name })} className="rounded p-1 text-wood-dark/70 hover:bg-wood/10">
              <LogOut size={16} aria-hidden />
            </button>
          </div>
          {c.quests.length === 0 && <p className="text-xs text-wood-dark/70">{t('classes.noQuests')}</p>}
          {c.quests.map((q) => {
            const done = q.progress >= q.target
            return (
              <div key={q.id} className="flex flex-wrap items-center gap-x-2 text-xs">
                {done && <Check size={14} className="text-grass-dark" aria-hidden />}
                <span className="font-bold">{q.topic}</span>
                {q.tp && <span>· TP{q.tp}+</span>}
                <span className={done ? 'font-bold text-grass-dark' : ''}>{`${Math.min(q.progress, q.target)} / ${q.target}`}</span>
                <span className="flex items-center gap-0.5 text-wood-dark/70">
                  · <MapPin size={12} aria-hidden /> {t(`regions.${q.island}.name`)}
                </span>
                <span className="text-wood-dark/70">· {t('classes.due', { date: q.due_on })}</span>
              </div>
            )
          })}
        </div>
      ))}
      {canJoin ? (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) onJoin(code.trim())
          }}
        >
          <Field label={t('classes.code')} value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" className="flex-1" />
          <Button type="submit" disabled={busy || !code.trim()}>
            {t('classes.join')}
          </Button>
        </form>
      ) : (
        <p className="text-xs font-semibold text-wood-dark">{t('classes.needParent')}</p>
      )}
      {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  )
}

/** The signed-in player's classes card, wired to the server. */
export function ClassesSlot({ uid }: { uid: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const guardian = useGuardian(uid)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const classes = useQuery({
    queryKey: ['my-classes', uid],
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_student_classes')
      if (error) throw error
      return data as StudentClass[]
    },
  })
  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true)
    setError(null)
    const { error } = await fn()
    setBusy(false)
    if (error) setError(t(/not valid/i.test(error.message) ? 'classes.errors.notValid' : /parent must approve/i.test(error.message) ? 'classes.needParent' : /your own class/i.test(error.message) ? 'classes.errors.own' : 'classes.errors.failed'))
    await queryClient.invalidateQueries({ queryKey: ['my-classes', uid] })
  }
  const status = guardian.data?.status
  if (!status) return null
  return (
    <MyClassesCard
      classes={classes.data ?? []}
      canJoin={status === 'approved' || status === 'not_needed'}
      busy={busy}
      error={error}
      onJoin={(code) => void run(() => supabase!.rpc('join_class', { p_code: code }))}
      onLeave={(id) => void run(() => supabase!.rpc('leave_class', { p_class: id }))}
    />
  )
}
