import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Check, X } from 'lucide-react'
import { buttonClasses, Paged, Panel, ProgressBar } from '../../components/ui'
import { useShortScreen } from '../../app/useShortScreen'
import { supabase } from '../../services/supabase'
import { useSession } from '../authentication/useSession'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { formatAnswer } from '../battle/QuestionCard'
import type { PublicQuestion } from '../battle/questionSchema'

type Entry = {
  id: string
  subject: string
  topic: string
  type: string
  prompt: string
  options: PublicQuestion['options']
  unit: string | null
  answer: unknown
  explanation: string
  last_correct: boolean
  attempts: number
}
type Mastery = { subject_id: string; topic: string; attempts: number; correct: number; mastery: number }

export function LibraryPage() {
  const { t } = useTranslation()
  const { session } = useSession()
  const uid = session?.user.id
  const [onlyMistakes, setOnlyMistakes] = useState(false)
  const [topic, setTopic] = useState<string | null>(null)

  const library = useQuery({
    queryKey: ['library', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_library')
      if (error) throw error
      return data as Entry[]
    },
  })
  const mastery = useQuery({
    queryKey: ['mastery', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase!.from('topic_mastery').select('subject_id, topic, attempts, correct, mastery').order('mastery')
      if (error) throw error
      return data as Mastery[]
    },
  })

  const entries = useMemo(() => (library.data ?? []).filter((e) => (!onlyMistakes || !e.last_correct) && (!topic || e.topic === topic)), [library.data, onlyMistakes, topic])

  const short = useShortScreen()
  const answerText = (e: Entry) => formatAnswer({ type: e.type as PublicQuestion['type'], options: e.options, unit: e.unit }, e.answer, t)

  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 short:gap-2 short:py-2">
        <header className="flex items-center gap-3">
          <Link to="/home" aria-label={t('common.back')} className={buttonClasses('secondary', 'md', 'px-3!')}>
            <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden />
          </Link>
          <h1 className="flex items-center gap-2 rounded-full bg-cream/90 px-4 py-1 text-2xl font-bold text-wood-dark short:py-0.5 short:text-lg">
            <BookOpen aria-hidden /> {t('library.title')}
          </h1>
        </header>

        {/* Phones held sideways: topics on the left, one saved question at a time on the right. */}
        <div className="flex flex-col gap-5 short:grid short:grid-cols-2 short:items-start short:gap-3">
        <div className="flex flex-col gap-5 short:gap-2">
        <Panel title={t('library.topics')}>
          {mastery.data?.length ? (
            <Paged list items={mastery.data} perPage={short ? 4 : Infinity} label={t('library.topics')} className="grid gap-3 sm:grid-cols-2 short:grid-cols-1 short:gap-1.5">
              {(m) => (
                <li key={`${m.subject_id}-${m.topic}`}>
                  <button
                    type="button"
                    aria-pressed={topic === m.topic}
                    onClick={() => setTopic((x) => (x === m.topic ? null : m.topic))}
                    className={`w-full rounded-xl border-2 p-2 text-start ${topic === m.topic ? 'border-wood-dark bg-gold/30' : 'border-wood/30 bg-white/80'}`}
                  >
                    <span className="flex justify-between text-sm font-bold">
                      <span>{m.topic}</span>
                      <span className="text-wood-dark">{t('library.score', { correct: m.correct, attempts: m.attempts })}</span>
                    </span>
                    <ProgressBar value={Number(m.mastery)} label={t('library.masteryOf', { topic: m.topic })} className="mt-1 h-4! short:h-2.5!" />
                  </button>
                </li>
              )}
            </Paged>
          ) : (
            <p className="text-sm">{t('library.empty')}</p>
          )}
        </Panel>

        <label className="flex items-center gap-2 self-start rounded-full bg-cream/90 px-3 py-1 text-sm font-semibold">
          <input type="checkbox" checked={onlyMistakes} onChange={(e) => setOnlyMistakes(e.target.checked)} className="size-4 accent-grass-dark" />
          {t('library.onlyMistakes')}
        </label>
        </div>

        <Paged list items={entries} perPage={short ? 1 : Infinity} label={t('library.title')} className="flex flex-col gap-3">
          {(e) => (
            <li key={e.id}>
              <Panel className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-xs font-bold text-wood-dark">
                  {e.last_correct ? <Check size={16} className="text-grass-dark" aria-label={t('library.gotRight')} /> : <X size={16} className="text-danger" aria-label={t('library.gotWrong')} />}
                  {t(`battle.subject.${e.subject}`, { defaultValue: e.subject })} · {e.topic} · {t('library.tries', { n: e.attempts })}
                </p>
                <p className="font-display text-lg font-semibold short:text-base">{e.prompt}</p>
                <p className="font-semibold text-grass-dark">{t('battle.correctAnswerIs', { answer: answerText(e) })}</p>
                <p className="text-sm short:text-xs">{e.explanation}</p>
              </Panel>
            </li>
          )}
        </Paged>
        {library.data && !entries.length && <p className="rounded-xl bg-cream/90 p-4 text-center text-sm">{t('library.nothingHere')}</p>}
        </div>
      </div>
    </main>
  )
}
