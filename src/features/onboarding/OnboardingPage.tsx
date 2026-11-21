import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  Blocks,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Library,
  Microscope,
  NotebookPen,
  ScrollText,
  Search,
  Sprout,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Button, Card, Paged, Panel, Select } from '../../components/ui'
import { useShortScreen } from '../../app/useShortScreen'
import { currentLanguage, LANGUAGES } from '../../i18n'
import { LanguagePicker } from '../../i18n/LanguagePicker'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { FormMessage } from '../authentication/AuthLayout'
import { BIRTH_YEAR_SPAN } from '../authentication/schemas'
import { useSession } from '../authentication/useSession'
import {
  curriculaFor,
  DIFFICULTIES,
  firstIncompleteStep,
  GOALS,
  gradesFor,
  onboardingSchema,
  STEPS,
  subjectsFor,
  type OnboardingValues,
  type Step,
} from './schema'
import { saveAcademicProfile, setBirthYear, useMyAcademicProfile, useMyProfile, useReferenceData } from './useReferenceData'

const LEVEL_ICONS: Record<string, LucideIcon> = {
  early_childhood: Blocks,
  primary: Backpack,
  lower_secondary: BookOpen,
  upper_secondary: NotebookPen,
  pre_university: Library,
  diploma: ScrollText,
  undergraduate: GraduationCap,
  postgraduate: Microscope,
  doctoral: FlaskConical,
  vocational: Wrench,
  lifelong: Sprout,
}

const DRAFT_KEY = 'eduventure.onboardingDraft'
const readDraft = (): Partial<OnboardingValues> => {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}')
  } catch {
    return {}
  }
}
const writeDraft = (v: Partial<OnboardingValues> | null) => {
  try {
    if (v) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(v))
    else sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // private mode: the draft just isn't kept across reloads
  }
}

/** Region from the browser locale (en-MY → MY), used to suggest a country. */
function browserRegion(): string | undefined {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const region = tag.split('-')[1]
    if (region && /^[A-Z]{2}$/i.test(region)) return region.toUpperCase()
  }
  return currentLanguage() === 'ms' ? 'MY' : undefined
}

export function OnboardingPage({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const { session } = useSession()
  const userId = session?.user.id
  const ref = useReferenceData()
  const profile = useMyProfile(userId)
  const existing = useMyAcademicProfile(mode === 'edit' ? userId : undefined)
  const short = useShortScreen()

  const [values, setValues] = useState<Partial<OnboardingValues>>(() => ({
    language: currentLanguage(),
    goals: [],
    difficulty: 3,
    grade_id: null,
    ...(mode === 'create' ? readDraft() : {}),
  }))
  const [birthYear, setBirthYearInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit mode starts from the saved profile.
  useEffect(() => {
    if (existing.data) setValues(existing.data)
  }, [existing.data])

  useEffect(() => {
    if (mode === 'create') writeDraft(values)
  }, [values, mode])

  const needsAge = profile.data ? profile.data.birth_year === null : false
  const grades = useMemo(() => (ref.data ? gradesFor(ref.data.grades, values.curriculum_id, values.level_id) : []), [ref.data, values.curriculum_id, values.level_id])
  const steps = STEPS.filter((s) => (s === 'age' ? needsAge : s === 'grade' ? grades.length > 0 : true))
  const requested = params.get('step') as Step | null
  const current: Step = requested && steps.includes(requested) ? requested : steps[0]
  const index = steps.indexOf(current)

  // Never let a reload or deep link land past an unanswered required step.
  const blocking = firstIncompleteStep(values, { needsAge })
  useEffect(() => {
    if (blocking && steps.indexOf(blocking) < index) setParams({ step: blocking }, { replace: true })
  }, [blocking, index, steps, setParams])

  const set =(patch: Partial<OnboardingValues>) => setValues((v) => ({ ...v, ...patch }))
  const go = (step: Step) => {
    setError(null)
    setParams({ step })
  }

  const stepValid: Record<Step, boolean> = {
    age: birthYear !== '',
    level: Boolean(values.level_id),
    country: Boolean(values.country_code),
    curriculum: Boolean(values.curriculum_id),
    grade: true,
    language: Boolean(values.language),
    subjects: Boolean(values.subject_ids?.length),
    goals: true,
    difficulty: Boolean(values.difficulty),
  }
  const isLast = index === steps.length - 1

  async function next() {
    setError(null)
    if (current === 'age') {
      setBusy(true)
      try {
        await setBirthYear(Number(birthYear))
        await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      } catch {
        setError('onboarding.errors.saveFailed')
        return
      } finally {
        setBusy(false)
      }
      return go('level')
    }
    if (!isLast) return go(steps[index + 1])

    const parsed = onboardingSchema.safeParse(values)
    if (!parsed.success || !userId) return setError('onboarding.errors.saveFailed')
    setBusy(true)
    try {
      await saveAcademicProfile(userId, parsed.data)
      writeDraft(null)
      await queryClient.invalidateQueries({ queryKey: ['academic', userId] })
      navigate(mode === 'edit' ? '/home' : '/character', { replace: true })
    } catch {
      setError('onboarding.errors.saveFailed')
    } finally {
      setBusy(false)
    }
  }

  const body = (): ReactNode => {
    if (ref.isError) return <FormMessage kind="error">{t('onboarding.errors.loadFailed')}</FormMessage>
    if (!ref.data || (session && profile.isPending)) return <p>{t('common.loading')}</p>
    const data = ref.data
    switch (current) {
      case 'age': {
        const year = new Date().getFullYear()
        return (
          <Select label={t('auth.birthYear')} hint={t('onboarding.ageHint')} value={birthYear} onChange={(e) => setBirthYearInput(e.target.value)}>
            <option value="" disabled>
              {t('auth.chooseYear')}
            </option>
            {Array.from({ length: BIRTH_YEAR_SPAN.maxAge - BIRTH_YEAR_SPAN.minAge + 1 }, (_, i) => year - BIRTH_YEAR_SPAN.minAge - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        )
      }
      case 'level':
        return (
          <Paged items={data.levels} perPage={short ? 4 : Infinity} label={t('onboarding.steps.level')} className="grid gap-3 sm:grid-cols-2 short:grid-cols-2 short:gap-2">
            {(l) => {
              const Icon = LEVEL_ICONS[l.id] ?? BookOpen
              return (
                <Card
                  key={l.id}
                  selected={values.level_id === l.id}
                  onSelect={() => set({ level_id: l.id, curriculum_id: undefined, grade_id: null, subject_ids: [] })}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-grass/25 text-grass-dark short:size-8">
                      <Icon aria-hidden />
                    </span>
                    <span>
                      <strong className="block font-display text-lg leading-tight short:text-sm">{t(`levels.${l.id}.name`)}</strong>
                      <span className="block text-sm text-ink/75 short:line-clamp-2 short:text-xs">{t(`levels.${l.id}.description`)}</span>
                      <span className="mt-1 inline-block rounded-full bg-wood/10 px-2 text-xs font-bold text-wood-dark short:hidden">
                        {t('onboarding.isced', { code: l.isced })}
                      </span>
                    </span>
                  </div>
                </Card>
              )
            }}
          </Paged>
        )
      case 'country':
        return <CountryStep short={short} countries={data.countries} value={values.country_code} onChange={(code) => set({ country_code: code, curriculum_id: undefined, grade_id: null })} />
      case 'curriculum':
        return (
          <div className="flex flex-col gap-3 short:gap-2">
            {curriculaFor(data.curricula, values.country_code, values.level_id).map((c) => (
              <Card key={c.id} selected={values.curriculum_id === c.id} onSelect={() => set({ curriculum_id: c.id, grade_id: null })}>
                <strong className="font-display text-lg short:text-sm">{c.id === 'international' ? t('onboarding.international') : c.name}</strong>
              </Card>
            ))}
            <p className="text-sm text-ink/70 short:text-xs">{t('onboarding.curriculumHint')}</p>
          </div>
        )
      case 'grade':
        return (
          <Paged
            items={[...grades.map((g) => ({ id: g.id as string | null, name: g.name })), { id: null, name: t('onboarding.gradeSkip') }]}
            perPage={short ? 6 : Infinity}
            label={t('onboarding.steps.grade')}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 short:gap-2"
          >
            {(g) => (
              <Card key={g.id ?? 'skip'} selected={values.grade_id === g.id} onSelect={() => set({ grade_id: g.id })}>
                <strong className={`font-display short:text-sm ${g.id === null ? 'font-normal text-ink/70' : ''}`}>{g.name}</strong>
              </Card>
            )}
          </Paged>
        )
      case 'language':
        return (
          <div className="flex flex-col gap-3 short:gap-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 short:grid-cols-4 short:gap-2">
              {LANGUAGES.map((l) => (
                <Card key={l.code} selected={values.language === l.code} onSelect={() => set({ language: l.code })}>
                  <strong lang={l.code} className="font-display text-lg short:text-sm">
                    {l.nativeName}
                  </strong>
                </Card>
              ))}
            </div>
            <p className="text-sm text-ink/70 short:text-xs">{t('onboarding.languageHint')}</p>
          </div>
        )
      case 'subjects':
        return (
          <Chips
            options={subjectsFor(data.subjects, values.level_id).map((s) => ({ id: s.id, label: s.name }))}
            selected={values.subject_ids ?? []}
            onChange={(subject_ids) => set({ subject_ids })}
            hint={t('onboarding.subjectsHint')}
            short={short}
            label={t('onboarding.steps.subjects')}
          />
        )
      case 'goals':
        return (
          <Chips
            options={GOALS.map((g) => ({ id: g, label: t(`goals.${g}`) }))}
            selected={values.goals ?? []}
            onChange={(goals) => set({ goals: goals as OnboardingValues['goals'] })}
            hint={t('onboarding.goalsHint')}
            short={short}
            label={t('onboarding.steps.goals')}
          />
        )
      case 'difficulty':
        return (
          <div className="grid gap-3 sm:grid-cols-5 short:grid-cols-5 short:gap-2">
            {DIFFICULTIES.map((d) => (
              <Card key={d} selected={values.difficulty === d} onSelect={() => set({ difficulty: d })} className="text-center">
                <span aria-hidden className="block text-xl tracking-tight text-gold">
                  {'★'.repeat(d)}
                </span>
                <strong className="font-display short:text-sm">{t(`difficulty.${d}`)}</strong>
              </Card>
            ))}
          </div>
        )
    }
  }

  const dots = (
    <ol className="flex gap-1.5" aria-hidden>
      {steps.map((s, i) => (
        <li key={s} className={`h-2.5 rounded-full transition-all ${i === index ? 'w-7 bg-gold' : i < index ? 'w-2.5 bg-grass-dark' : 'w-2.5 bg-cream/80 short:bg-wood/25'}`} />
      ))}
    </ol>
  )
  const backButton = (
    <Button variant="secondary" onClick={() => go(steps[index - 1])} disabled={index === 0 || busy}>
      <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden /> {t('common.back')}
    </Button>
  )
  const nextButton = (
    <Button onClick={next} disabled={!stepValid[current] || busy}>
      {busy ? t('common.loading') : isLast ? t('onboarding.finish') : t('common.next')}
      {!busy && !isLast && <ArrowRight size={18} className="rtl:rotate-180" aria-hidden />}
    </Button>
  )

  // A phone held sideways: the step and its buttons in a side column, the answers filling the rest; nothing scrolls.
  if (short)
    return (
      <main className="relative h-dvh overflow-hidden">
        <SceneBackdrop />
        <div className="relative mx-auto flex h-dvh max-w-4xl gap-3 px-3 py-2">
          <aside className="flex w-44 shrink-0 flex-col gap-2">
            <p className="truncate rounded-full bg-cream/90 px-3 py-0.5 text-center font-display text-sm font-semibold text-wood-dark">
              {t(mode === 'edit' ? 'onboarding.editTitle' : 'onboarding.title')}
            </p>
            <LanguagePicker />
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-cream/90 p-2 text-center">
              {dots}
              <p className="text-xs font-bold text-wood-dark">{t('onboarding.stepOf', { n: index + 1, total: steps.length })}</p>
              <h2 className="font-display text-base leading-tight font-semibold text-wood-dark">{t(`onboarding.steps.${current}`)}</h2>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              {nextButton}
              {backButton}
            </div>
          </aside>
          <Panel className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
            {error && <FormMessage kind="error">{t(error)}</FormMessage>}
            {body()}
          </Panel>
        </div>
      </main>
    )

  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pt-4 pb-8">
        <header className="flex items-center justify-between gap-3">
          <p className="rounded-full bg-cream/90 px-3 py-1 font-display font-semibold text-wood-dark">
            {t(mode === 'edit' ? 'onboarding.editTitle' : 'onboarding.title')}
          </p>
          <LanguagePicker />
        </header>

        <div className="flex flex-col items-center gap-2 pt-6">
          {dots}
          <p className="text-sm font-bold text-wood-dark">{t('onboarding.stepOf', { n: index + 1, total: steps.length })}</p>
        </div>

        <Panel title={t(`onboarding.steps.${current}`)} className="flex flex-col gap-4">
          {error && <FormMessage kind="error">{t(error)}</FormMessage>}
          {body()}
          {/* Sticky so Next stays reachable on phones even below long lists. */}
          <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-between gap-3 rounded-b-3xl border-t-2 border-wood/20 bg-cream px-5 pt-4 pb-5">
            {backButton}
            {nextButton}
          </div>
        </Panel>
      </div>
    </main>
  )
}

function CountryStep({ countries, value, onChange, short }: { countries: { code: string; name: string }[]; value?: string; onChange: (code: string) => void; short: boolean }) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const suggested = useMemo(browserRegion, [])
  const names = useMemo(() => {
    const display = new Intl.DisplayNames([i18n.language], { type: 'region' })
    return countries
      .map((c) => ({ code: c.code, name: display.of(c.code) ?? c.name }))
      .sort((a, b) => a.name.localeCompare(b.name, i18n.language))
  }, [countries, i18n.language])
  const q = query.trim().toLowerCase()
  const shown = names.filter((c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q)
  const ordered = q ? shown : [...shown.filter((c) => c.code === suggested), ...shown.filter((c) => c.code !== suggested)]

  return (
    <div className="flex min-h-0 flex-col gap-3 short:gap-2">
      <label className="flex items-center gap-2 rounded-xl border-[3px] border-wood/60 bg-white px-3 focus-within:border-water-dark">
        <Search size={18} className="text-wood" aria-hidden />
        <span className="sr-only">{t('onboarding.searchCountry')}</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('onboarding.searchCountry')} className="min-h-11 flex-1 bg-transparent outline-none short:min-h-9" />
      </label>
      <Paged
        items={ordered}
        perPage={short ? 8 : Infinity}
        resetKey={q}
        label={t('onboarding.steps.country')}
        boxProps={{ role: 'listbox', 'aria-label': t('onboarding.steps.country') }}
        className={`grid gap-2 p-1 sm:grid-cols-2 ${short ? 'grid-cols-2' : 'max-h-[46dvh] overflow-y-auto'}`}
      >
        {(c) => (
          <button
            key={c.code}
            type="button"
            role="option"
            aria-selected={value === c.code}
            onClick={() => onChange(c.code)}
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-start font-semibold short:py-1.5 short:text-sm ${value === c.code ? 'border-grass-dark bg-grass/20' : 'border-wood/30 bg-white/80 hover:border-wood'}`}
          >
            <span aria-hidden className="text-xl leading-none">
              {String.fromCodePoint(...[...c.code].map((ch) => 0x1f1a5 + ch.charCodeAt(0)))}
            </span>
            {c.name}
          </button>
        )}
      </Paged>
    </div>
  )
}

function Chips({ options, selected, onChange, hint, short, label }: { options: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void; hint: string; short: boolean; label: string }) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  return (
    <div className="flex flex-col gap-3 short:gap-2">
      <p className="text-sm text-ink/70 short:text-xs">{hint}</p>
      <Paged items={options} perPage={short ? 12 : Infinity} label={label} className={`flex flex-wrap gap-2 p-1 ${short ? '' : 'max-h-[46dvh] overflow-y-auto'}`}>
        {(o) => {
          const on = selected.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.id)}
              className={`rounded-full border-2 px-4 py-2 font-semibold transition short:px-3 short:py-1.5 short:text-sm ${on ? 'border-grass-dark bg-grass text-white' : 'border-wood/40 bg-white/85 text-ink hover:border-wood'}`}
            >
              {o.label}
            </button>
          )
        }}
      </Paged>
    </div>
  )
}
