import { BreakReminder } from '../parents/BreakReminder'
import { usePlayClock } from '../parents/usePlayClock'
import { Suspense, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useGame } from '../../game/store'
import { usePlace } from '../../game/placeStore'
import { setAcademyOrigin } from '../academy/origin'
import { useTranslation } from 'react-i18next'
import { House, PawPrint, Settings } from 'lucide-react'
import { buttonClasses } from '../../components/ui'
import { useSession } from '../authentication/useSession'
import { useMyCharacter, useProgression } from '../character/useCharacter'
import { useMyTitle } from '../character/TitlePicker'
import { usePet } from '../pet/usePet'
import { useReturning } from '../review/useReturning'
import { GameCanvas } from './GameCanvas'
import { Hud } from './Hud'
import { Minimap } from './Minimap'
import { InteractButton, Joystick } from './TouchControls'
import { DialogueBox } from './DialogueBox'
import { CoinBurst } from './CoinBurst'
import { JettyPanel } from './JettyPanel'
import { AreaBanner } from './AreaBanner'
import { BattlePanel } from '../battle/BattlePanel'
import { BossPanel } from '../battle/BossPanel'
import { WorldSettings } from './WorldSettings'
import { HarvestPanel } from '../harvest/HarvestPanel'
import { MaterialsBar } from '../harvest/MaterialsBar'
import { CraftPanel } from '../harvest/CraftPanel'

export function WorldPage() {
  const { t } = useTranslation()
  const { session } = useSession()
  const uid = session?.user.id
  const character = useMyCharacter(uid)
  const progression = useProgression(uid)
  const title = useMyTitle(uid)
  const pet = usePet(uid)
  const returning = useReturning(uid)
  const sessionMinutes = usePlayClock(uid)
  const settingsOpen = useGame((s) => s.settings)
  const setSettingsOpen = (open: boolean) => useGame.setState({ settings: open })
  const navigate = useNavigate()
  const academy = useGame((s) => s.academy)

  // Cikgu Byte opens the Code Academy; remember the spot so "Back to the world" returns to the door.
  useEffect(() => {
    if (!academy) return
    const p = useGame.getState().player
    usePlace.setState({ resumeAt: { x: Math.floor(p.x), y: Math.floor(p.y) } })
    useGame.setState({ academy: null })
    setAcademyOrigin('world')
    navigate(academy === 'language' ? '/hall' : '/academy')
  }, [academy, navigate])

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#5fb3d9] select-none">
      {character.data && <GameCanvas hero={character.data.appearance} pet={pet.data} returning={returning.data} />}
      {/* Overlays ignore pointer events except on their own controls, so taps reach the map. */}
      <div className="pointer-events-none absolute inset-0">
        {/* The player card with the materials stacked under it, so they never overlap whatever the card's height. */}
        <div className="absolute start-3 top-3 z-10 flex flex-col items-start gap-1.5">
          {character.data && <Hud character={character.data} xp={progression.data?.xp ?? 0} gold={progression.data?.gold ?? 0} title={title.data} />}
          <MaterialsBar />
        </div>
        <Link to="/home" aria-label={t('world.home')} className={buttonClasses('secondary', 'md', 'pointer-events-auto absolute end-3 top-3 z-10 px-3!')}>
          <House size={20} aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('settings.open')}
          title={t('settings.open')}
          className={buttonClasses('secondary', 'md', 'pointer-events-auto absolute end-3 top-16 z-10 px-3!')}
        >
          <Settings size={20} aria-hidden />
        </button>
        <Link to="/pet" aria-label={t('pet.open')} title={t('pet.open')} className={buttonClasses('secondary', 'md', 'pointer-events-auto absolute end-3 top-[7.25rem] z-10 px-3!')}>
          <PawPrint size={20} aria-hidden />
        </Link>
        <Suspense fallback={null}>
          <Minimap />
        </Suspense>
        <Joystick />
        <InteractButton />
        <DialogueBox playerName={character.data?.name ?? ''} />
        <AreaBanner />
        <JettyPanel returning={returning.data} />
        <BattlePanel />
        <BossPanel />
        <HarvestPanel />
        <CraftPanel />
        <CoinBurst />
        <BreakReminder minutes={sessionMinutes} />
        {settingsOpen && <WorldSettings onClose={() => setSettingsOpen(false)} />}
      </div>
    </main>
  )
}
