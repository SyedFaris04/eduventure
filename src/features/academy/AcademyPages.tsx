import { useSession } from '../authentication/useSession'
import { BreakReminder } from '../parents/BreakReminder'
import { usePlayClock } from '../parents/usePlayClock'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Braces, CheckCircle2, Code2, Languages, Lock, PlayCircle } from 'lucide-react'
import { buttonClasses, Paged, Panel, ProgressBar } from '../../components/ui'
import { useShortScreen } from '../../app/useShortScreen'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { useCatalogue, useCourseProgress, type Catalogue, type CourseKind } from './academyApi'
import { LessonPlayer } from './LessonPlayer'
import { academyOrigin } from './origin'
import { unitUnlocked } from './progress'

/** The Code Academy (/academy) and the Language Hall (/hall) share these pages; each shows only its own courses. */
const BASE: Record<CourseKind, string> = { code: '/academy', language: '/hall' }
const NS: Record<CourseKind, 'academy' | 'hall'> = { code: 'academy', language: 'hall' }

function Shell({ back, backLabel, title, kind = 'code', children }: { back: string; backLabel: string; title: string; kind?: CourseKind; children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 short:gap-3 short:py-2">
        <header className="flex flex-wrap items-center gap-3">
          <Link to={back} aria-label={backLabel} className={buttonClasses('secondary', 'md', 'px-3!')}>
            <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden />
          </Link>
          <h1 className="flex items-center gap-2 rounded-full bg-cream/90 px-4 py-1 text-2xl font-bold text-wood-dark short:py-0.5 short:text-lg">
            {kind === 'code' ? <Code2 aria-hidden /> : <Languages aria-hidden />} {title}
          </h1>
        </header>
        {children}
      </div>
    </main>
  )
}

const courseOf = (cat: Catalogue | undefined, id: string | undefined) => cat?.courses.find((c) => c.id === id)

/** /academy or /hall: every course of that kind with how far the learner has got. */
export function AcademyPage({ kind = 'code' }: { kind?: CourseKind }) {
  const { t } = useTranslation()
  const catalogue = useCatalogue()
  const courses = catalogue.data?.courses.filter((c) => c.kind === kind)
  return (
    <Shell kind={kind} back={academyOrigin()} backLabel={academyOrigin() === '/world' ? t('academy.backToWorld') : t('academy.backToHome')} title={t(`${NS[kind]}.title`)}>
      <p className="rounded-xl bg-cream/85 px-4 py-2 font-semibold text-wood-dark short:py-1 short:text-sm tiny:hidden">{t(`${NS[kind]}.intro`)}</p>
      {catalogue.isError && (
        <p role="alert" className="rounded-xl border-2 border-danger bg-danger/10 p-2 font-semibold">
          {t('academy.errors.generic')}
        </p>
      )}
      {!catalogue.data && !catalogue.isError && <p className="font-display text-wood-dark">{t('common.loading')}</p>}
      <ul className="grid gap-4 sm:grid-cols-2 short:grid-cols-2 short:gap-3">
        {courses?.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </ul>
    </Shell>
  )
}

function CourseCard({ course }: { course: Catalogue['courses'][number] }) {
  const { t } = useTranslation()
  const progress = useCourseProgress(course.id)
  const total = course.units.reduce((n, u) => n + u.lessons.length, 0)
  const done = progress.data?.size ?? 0
  return (
    <li>
      <Link to={`${BASE[course.kind]}/${course.id}`} className="block rounded-3xl border-4 border-wood bg-cream p-4 shadow-[0_6px_0_rgb(92_58_36/0.35)] hover:-translate-y-0.5 short:rounded-2xl short:border-[3px] short:p-3">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-wood-dark short:text-base">
          {course.kind === 'code' ? <Braces aria-hidden /> : <Languages aria-hidden />} {course.title}
        </p>
        <ProgressBar thin value={total ? done / total : 0} label={t('academy.lessonsDone', { done, total })} className="mt-3 h-3!" />
        <p className="mt-1 text-sm font-semibold">{t('academy.lessonsDone', { done, total })}</p>
      </Link>
    </li>
  )
}

/** /academy/:course: units in order, each locked until the one before is finished. */
export function CoursePage() {
  const { t } = useTranslation()
  const { course: id } = useParams()
  const catalogue = useCatalogue()
  const progress = useCourseProgress(id ?? '')
  const course = courseOf(catalogue.data, id)
  const completed = progress.data ?? new Set<string>()
  const units = course?.units.map((u) => ({ lessonIds: u.lessons.map((l) => l.id) })) ?? []
  const short = useShortScreen()
  return (
    <Shell kind={course?.kind} back={BASE[course?.kind ?? 'code']} backLabel={t('academy.backToAcademy')} title={course?.title ?? ''}>
      {!course && <p className="font-display text-wood-dark">{t('common.loading')}</p>}
      {/* Phones held sideways: one unit per page (‹ 1 2 3 ›). */}
      <Paged items={course?.units ?? []} perPage={short ? 1 : Infinity} label={course?.title ?? ''} className="flex flex-col gap-5">
      {(u, ui) => {
        const open = unitUnlocked(units, ui, completed)
        return (
          <Panel key={u.index} title={t('academy.unit', { n: u.index, title: u.title })}>
            {!open && (
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-wood-dark">
                <Lock size={16} aria-hidden /> {t('academy.lockedUnit')}
              </p>
            )}
            <ol className="grid gap-2 short:grid-cols-2">
              {u.lessons.map((l) => {
                const finished = completed.has(l.id)
                const body = (
                  <>
                    {finished ? <CheckCircle2 className="text-grass-dark" aria-label={t('academy.completed')} /> : open ? <PlayCircle className="text-wood-dark" aria-hidden /> : <Lock className="text-wood-dark/60" aria-hidden />}
                    <span className="font-semibold">
                      {u.index}.{l.lesson_index} {l.title}
                    </span>
                  </>
                )
                return (
                  <li key={l.id}>
                    {open ? (
                      <Link to={`${BASE[course!.kind]}/${course!.id}/${l.id}`} className="flex min-h-12 items-center gap-3 rounded-2xl border-[3px] border-wood/50 bg-white px-3 hover:border-wood short:min-h-11 short:gap-2 short:text-sm">
                        {body}
                      </Link>
                    ) : (
                      <span aria-disabled className="flex min-h-12 items-center gap-3 rounded-2xl border-[3px] border-wood/20 bg-white/50 px-3 opacity-70 short:min-h-11 short:gap-2 short:text-sm">
                        {body}
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </Panel>
        )
      }}
      </Paged>
    </Shell>
  )
}

/** /academy/:course/:lesson: the lesson player, full width. */
export function LessonPage() {
  const { session } = useSession()
  const sessionMinutes = usePlayClock(session?.user.id)
  const { course: courseId, lesson: lessonId } = useParams()
  const navigate = useNavigate()
  const catalogue = useCatalogue()
  const course = courseOf(catalogue.data, courseId)
  if (!course || !lessonId) return null
  const all = course.units.flatMap((u) => u.lessons)
  const next = all[all.findIndex((l) => l.id === lessonId) + 1]
  return (
    <main className="min-h-dvh bg-[#f6efe0]">
      <LessonPlayer
        key={lessonId}
        courseId={course.id}
        lessonId={lessonId}
        language={course.language}
        onExit={() => navigate(`${BASE[course.kind]}/${course.id}`)}
        onNext={next ? () => navigate(`${BASE[course.kind]}/${course.id}/${next.id}`) : undefined}
      />
      <BreakReminder minutes={sessionMinutes} />
    </main>
  )
}
