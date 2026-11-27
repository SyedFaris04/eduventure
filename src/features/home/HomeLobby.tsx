import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BookOpen, ClipboardCheck, Code2, Coins, Globe2, GraduationCap, Languages, LogOut, MoreHorizontal, PawPrint, Pencil, Save, ShoppingBag, Target, Volume2, VolumeX } from 'lucide-react'
import { Button, buttonClasses, FitToScreen, Modal, Panel, ProgressBar } from '../../components/ui'
import { LanguagePicker } from '../../i18n/LanguagePicker'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { Snapshot } from '../../world3d/SnapshotImage'
import { levelProgress } from '../../game/levels'
import { MissionsPanel } from '../missions/MissionsPanel'
import { TitlePicker } from '../character/TitlePicker'
import { AdventureSlot } from '../pet/AdventureCard'
import { ParentCardSlot } from '../parents/ParentCardSlot'
import { ClassesSlot } from '../teacher/MyClassesCard'
import { setAcademyOrigin } from '../academy/origin'
import type { Appearance } from '../character/appearance'
import { GuestUpgrade } from './GuestUpgrade'

export type LobbyProps = {
  uid: string | undefined
  name: string
  appearance: Appearance | undefined
  xp: number | undefined
  gold: number | undefined
  title: string | null
  isGuest: boolean
  under13: boolean
  canTeach: boolean
  isReviewer: boolean
  profile: ReactNode
  soundOn: boolean
  onSound: () => void
  onSignOut: () => void
}

type Sheet = 'missions' | 'more' | 'guest' | null

/** A menu tile: an icon and a short label, at least 44 px tall. */
const tile = 'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl border-[3px] border-wood bg-cream/95 px-1 py-1 text-center font-display text-xs leading-tight font-semibold text-wood-dark shadow-[0_3px_0_var(--color-wood)] active:translate-y-0.5 tiny:min-h-11'

/**
 * Home on a phone held sideways: a game lobby that fits one screen. The hero in the middle, the menu on the left,
 * Enter the World and the panels (missions, the rest of Home) on the right. Everything Home offers is one tap away.
 */
export function HomeLobby(p: LobbyProps) {
  const { t } = useTranslation()
  const [sheet, setSheet] = useState<Sheet>(null)
  const lp = levelProgress(p.xp ?? 0)
  const close = () => setSheet(null)

  return (
    <main className="relative h-dvh overflow-hidden">
      <SceneBackdrop />
      <div className="relative mx-auto flex h-dvh max-w-4xl flex-col gap-2 px-3 py-2">
        <header className="flex items-center gap-2">
          <section aria-label={t('home.progress')} className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border-[3px] border-wood bg-cream/95 px-2 py-1 shadow-[0_3px_0_var(--color-wood-dark)]">
            <span className="shrink-0 rounded-full bg-wood px-2 text-xs font-bold text-cream">{t('world.levelShort', { level: lp.level })}</span>
            <ProgressBar thin value={lp.into / lp.needed} label={t('world.xpLabel', { into: lp.into, needed: lp.needed })} className="h-3! min-w-16 flex-1" />
            <span className="shrink-0 text-xs font-bold text-wood-dark">
              {lp.into}/{lp.needed} XP
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-wood-dark">
              <Coins size={16} className="text-path-dark" aria-hidden /> {p.gold ?? '–'}
            </span>
          </section>
          <LanguagePicker />
          <Button variant="secondary" aria-pressed={p.soundOn} aria-label={t('common.sound')} onClick={p.onSound} className="px-2.5!">
            {p.soundOn ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
          </Button>
          <Button variant="secondary" aria-label={t('home.signOut')} onClick={p.onSignOut} className="px-2.5!">
            <LogOut size={18} className="rtl:rotate-180" aria-hidden />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] gap-3">
          {/* Shrinks to fit when a teacher or reviewer has extra buttons, or the phone uses a larger font. */}
          <FitToScreen center>
          <nav aria-label={t('home.yourHero')} className="grid grid-cols-2 gap-2">
            <Link to="/library" className={tile}>
              <BookOpen size={20} aria-hidden /> {t('home.library')}
            </Link>
            <Link to="/shop" className={tile}>
              <ShoppingBag size={20} aria-hidden /> {t('home.shop')}
            </Link>
            <Link to="/pet" className={tile}>
              <PawPrint size={20} aria-hidden /> {t('pet.title')}
            </Link>
            <Link to="/academy" onClick={() => setAcademyOrigin('home')} className={tile}>
              <Code2 size={20} aria-hidden /> {t('home.academy')}
            </Link>
            <Link to="/hall" onClick={() => setAcademyOrigin('home')} className={tile}>
              <Languages size={20} aria-hidden /> {t('home.hall')}
            </Link>
            {p.canTeach && (
              <Link to="/teacher" className={tile}>
                <GraduationCap size={20} aria-hidden /> {t('teacher.title')}
              </Link>
            )}
            {p.isReviewer && (
              <Link to="/admin" className={tile}>
                <ClipboardCheck size={20} aria-hidden /> {t('home.admin')}
              </Link>
            )}
          </nav>
          </FitToScreen>

          <section aria-label={t('home.yourHero')} className="flex min-h-0 flex-col items-center justify-end gap-1">
            {p.appearance && (
              <Snapshot subject={{ kind: 'hero', appearance: p.appearance }} px={220} alt={t('character.previewAlt', { name: p.name })} className="hero-bob min-h-0 w-auto max-w-full flex-1 object-contain" />
            )}
            <div className="flex items-center gap-1">
              <p className="max-w-40 truncate rounded-full bg-cream px-3 py-0.5 font-display text-base font-semibold text-wood-dark shadow-[0_3px_0_var(--color-wood)]">{p.name}</p>
              <Link to="/character" aria-label={t('home.editHero')} className={buttonClasses('secondary', 'md', 'px-2.5!')}>
                <Pencil size={16} aria-hidden />
              </Link>
            </div>
          </section>

          <FitToScreen center>
          <div className="flex flex-col gap-2">
            <Link to="/world" className={buttonClasses('primary', 'lg', 'min-h-16! w-full text-lg! tiny:min-h-14!')}>
              <Globe2 size={22} aria-hidden /> {t('home.enterWorld')}
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={tile} onClick={() => setSheet('missions')}>
                <Target size={20} aria-hidden /> {t('missions.title')}
              </button>
              <button type="button" className={tile} onClick={() => setSheet('more')}>
                <MoreHorizontal size={20} aria-hidden /> {t('home.more')}
              </button>
              {p.isGuest && (
                <button type="button" className={`${tile} col-span-2 border-gold!`} onClick={() => setSheet('guest')}>
                  <Save size={20} aria-hidden /> {t('home.guestTitle')}
                </button>
              )}
            </div>
          </div>
          </FitToScreen>
        </div>
      </div>

      <Modal open={sheet === 'missions'} onClose={close} title={t('missions.title')}>
        {p.uid && sheet === 'missions' && <MissionsPanel uid={p.uid} />}
      </Modal>
      <Modal open={sheet === 'more'} onClose={close} title={t('home.more')}>
        {sheet === 'more' && (
          <div className="flex flex-col gap-4">
            {p.uid && <AdventureSlot uid={p.uid} />}
            {p.uid && <ParentCardSlot uid={p.uid} />}
            {p.profile}
            {p.uid && (
              <Panel title={t('home.yourHero')}>
                <TitlePicker uid={p.uid} level={lp.level} current={p.title} />
              </Panel>
            )}
            {p.uid && <ClassesSlot uid={p.uid} />}
          </div>
        )}
      </Modal>
      <Modal open={sheet === 'guest'} onClose={close} title={t('home.guestTitle')}>
        {sheet === 'guest' && <GuestUpgrade under13={p.under13} />}
      </Modal>
    </main>
  )
}
