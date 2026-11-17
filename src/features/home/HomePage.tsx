import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, ClipboardCheck, Code2, Coins, Languages, Globe2, LogOut, PawPrint, Pencil, ShoppingBag, Sparkles, Star, Volume2, VolumeX } from 'lucide-react'
import { useMyRoles } from '../admin/review'
import { MissionsPanel } from '../missions/MissionsPanel'
import { TitlePicker, useMyTitle } from '../character/TitlePicker'
import { setAcademyOrigin } from '../academy/origin'
import { Button, buttonClasses, Field, Modal, Panel } from '../../components/ui'
import { LanguagePicker } from '../../i18n/LanguagePicker'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { FormMessage } from '../authentication/AuthLayout'
import { AuthMessageError, signOut, upgradeGuest } from '../authentication/authActions'
import { ageBandFromBirthYear } from '../authentication/ageBand'
import { emailOnlySchema, type EmailOnlyValues } from '../authentication/schemas'
import { useSession } from '../authentication/useSession'
import { useMyAcademicProfile, useMyProfile, useReferenceData } from '../onboarding/useReferenceData'
import { Snapshot } from '../../world3d/SnapshotImage'
import { useMyCharacter, useProgression } from '../character/useCharacter'
import { getSoundEnabled, playChime, setSoundEnabled } from '../loading/sound'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const uid = session?.user.id
  const character = useMyCharacter(uid)
  const progression = useProgression(uid)
  const title = useMyTitle(uid)
  const academic = useMyAcademicProfile(uid)
  const profile = useMyProfile(uid)
  const ref = useReferenceData()
  const roles = useMyRoles(uid)
  const [soundOn, setSoundOn] = useState(getSoundEnabled)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  const isGuest = session?.user.is_anonymous ?? false
  const under13 = profile.data?.birth_year != null && ageBandFromBirthYear(profile.data.birth_year) === 'under13'
  const curriculum = ref.data?.curricula.find((c) => c.id === academic.data?.curriculum_id)
  const grade = ref.data?.grades.find((g) => g.id === academic.data?.grade_id)

  async function doSignOut() {
    await signOut()
    queryClient.clear()
    navigate('/welcome', { replace: true })
  }

  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-5 px-4 pt-4 pb-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <p className="title-outline bg-gradient-to-b from-[#fff1a8] via-gold to-[#ef9b2f] bg-clip-text font-display text-3xl font-bold text-transparent">
            {t('common.appName').toUpperCase()}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <LanguagePicker />
            <Button
              variant="secondary"
              aria-pressed={soundOn}
              aria-label={t('common.sound')}
              onClick={() => {
                setSoundEnabled(!soundOn)
                setSoundOn(!soundOn)
                if (!soundOn) playChime('tap')
              }}
              className="px-3!"
            >
              {soundOn ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
            </Button>
            <Button variant="secondary" onClick={() => (isGuest ? setConfirmSignOut(true) : void doSignOut())}>
              <LogOut size={18} className="rtl:rotate-180" aria-hidden /> {t('home.signOut')}
            </Button>
          </div>
        </header>

        <h1 className="text-center font-display text-3xl font-bold text-wood-dark md:text-start">{t('home.welcome', { name: character.data?.name ?? '' })}</h1>

        <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Panel title={t('home.yourHero')} className="flex flex-col items-center gap-3 md:self-start">
            {character.data && (
              <Snapshot subject={{ kind: 'hero', appearance: character.data.appearance }} px={220} alt={t('character.previewAlt', { name: character.data.name })} className="hero-bob w-[min(60vw,200px)]" />
            )}
            <p className="font-display text-2xl font-semibold">{character.data?.name}</p>
            {uid && progression.data && <TitlePicker uid={uid} level={progression.data.level} current={title.data ?? null} />}
            <Link to="/character" className={buttonClasses('secondary', 'md')}>
              <Pencil size={18} aria-hidden /> {t('home.editHero')}
            </Link>
            {/* The main action sits right under the hero so it is always near the top. */}
            <Link to="/world" className={buttonClasses('primary', 'lg', 'w-full')}>
              <Globe2 size={22} aria-hidden /> {t('home.enterWorld')}
            </Link>
            <div className="grid w-full grid-cols-2 gap-2">
              <Link to="/library" className={buttonClasses('secondary', 'md', 'w-full')}>
                <BookOpen size={18} aria-hidden /> {t('home.library')}
              </Link>
              <Link to="/shop" className={buttonClasses('secondary', 'md', 'w-full')}>
                <ShoppingBag size={18} aria-hidden /> {t('home.shop')}
              </Link>
              <Link to="/pet" className={buttonClasses('secondary', 'md', 'w-full')}>
                <PawPrint size={18} aria-hidden /> {t('pet.title')}
              </Link>
            </div>
            <Link to="/academy" onClick={() => setAcademyOrigin('home')} className={buttonClasses('secondary', 'md', 'w-full')}>
              <Code2 size={18} aria-hidden /> {t('home.academy')}
            </Link>
            <Link to="/hall" onClick={() => setAcademyOrigin('home')} className={buttonClasses('secondary', 'md', 'w-full')}>
              <Languages size={18} aria-hidden /> {t('home.hall')}
            </Link>
            {roles.data && roles.data.length > 0 && (
              <Link to="/admin" className={buttonClasses('secondary', 'md', 'w-full')}>
                <ClipboardCheck size={18} aria-hidden /> {t('home.admin')}
              </Link>
            )}
          </Panel>

          <div className="flex flex-col gap-5">
            <Panel title={t('home.progress')}>
              <dl className="grid grid-cols-3 gap-3 text-center">
                <Stat icon={<Star className="fill-gold text-wood-dark" aria-hidden />} label={t('home.level')} value={progression.data?.level} />
                <Stat icon={<Sparkles className="text-water-dark" aria-hidden />} label={t('home.xp')} value={progression.data?.xp} />
                <Stat icon={<Coins className="text-path-dark" aria-hidden />} label={t('home.gold')} value={progression.data?.gold} />
              </dl>
            </Panel>

            <Panel title={t('home.learningProfile')} className="flex flex-col gap-2">
              {academic.data && (
                <>
                  <p className="flex items-center gap-2 font-semibold">
                    <BookOpen size={18} className="shrink-0 text-grass-dark" aria-hidden />
                    {t(`levels.${academic.data.level_id}.name`)}
                  </p>
                  <p className="text-sm text-ink/80">
                    {curriculum?.id === 'international' ? t('onboarding.international') : curriculum?.name}
                    {grade ? ` · ${grade.name}` : ''}
                  </p>
                  <p className="text-sm text-ink/80">{t('home.subjects', { count: academic.data.subject_ids.length })}</p>
                </>
              )}
              <Link to="/settings/academic" className="self-start text-sm font-bold text-water-dark underline">
                {t('home.change')}
              </Link>
            </Panel>

            {uid && <MissionsPanel uid={uid} />}

            {isGuest && <GuestUpgrade under13={under13} />}
          </div>
        </div>
      </div>

      <Modal open={confirmSignOut} onClose={() => setConfirmSignOut(false)} title={t('home.signOutGuestTitle')}>
        <p>{t('home.signOutGuestBody')}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmSignOut(false)}>
            {t('home.cancel')}
          </Button>
          <Button onClick={() => void doSignOut()}>{t('home.signOutAnyway')}</Button>
        </div>
      </Modal>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | undefined }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-wood/30 bg-white/70 p-3">
      {icon}
      <dt className="text-xs font-bold tracking-wide text-wood-dark uppercase">{label}</dt>
      <dd className="font-display text-2xl font-bold">{value ?? '–'}</dd>
    </div>
  )
}

function GuestUpgrade({ under13 }: { under13: boolean }) {
  const { t } = useTranslation()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<EmailOnlyValues>({ resolver: zodResolver(emailOnlySchema) })

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null)
    try {
      await upgradeGuest(email)
      setSentTo(email)
    } catch (e) {
      setFormError(e instanceof AuthMessageError ? e.key : 'auth.errors.generic')
    }
  })

  return (
    <Panel title={t('home.guestTitle')}>
      {sentTo ? (
        <FormMessage kind="success">{t('home.linkSent', { email: sentTo })}</FormMessage>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <p className="text-sm">{t(under13 ? 'home.guestIntroU13' : 'home.guestIntro')}</p>
          {formError && <FormMessage kind="error">{t(formError)}</FormMessage>}
          <Field
            label={t(under13 ? 'auth.guardianEmail' : 'auth.email')}
            type="email"
            autoComplete="email"
            error={formState.errors.email?.message && t(formState.errors.email.message)}
            {...register('email')}
          />
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('common.loading') : t('home.sendLink')}
          </Button>
        </form>
      )}
    </Panel>
  )
}
