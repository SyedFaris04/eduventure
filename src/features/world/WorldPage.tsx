import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Gauge, House } from 'lucide-react'
import { buttonClasses } from '../../components/ui'
import { useSession } from '../authentication/useSession'
import { useMyCharacter, useProgression } from '../character/useCharacter'
import { GameCanvas } from './GameCanvas'
import { Hud } from './Hud'
import { Minimap } from './Minimap'
import { InteractButton, Joystick } from './TouchControls'
import { DialogueBox } from './DialogueBox'
import { CoinBurst } from './CoinBurst'
import { BattlePanel } from '../battle/BattlePanel'
import { BossPanel } from '../battle/BossPanel'
import { NEXT_CHOICE, useQuality } from '../../world3d/qualityStore'

export function WorldPage() {
  const { t } = useTranslation()
  const { session } = useSession()
  const uid = session?.user.id
  const character = useMyCharacter(uid)
  const progression = useProgression(uid)
  const quality = useQuality()
  const qualityText = t('world.quality', { level: t(`world.qualityLevel.${quality.choice}`) })

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#5fb3d9] select-none">
      {character.data && <GameCanvas hero={character.data.appearance} />}
      {/* Overlays ignore pointer events except on their own controls, so taps reach the map. */}
      <div className="pointer-events-none absolute inset-0">
        {character.data && <Hud character={character.data} xp={progression.data?.xp ?? 0} gold={progression.data?.gold ?? 0} />}
        <Link to="/home" aria-label={t('world.home')} className={buttonClasses('secondary', 'md', 'pointer-events-auto absolute end-3 top-3 z-10 px-3!')}>
          <House size={20} aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => quality.setChoice(NEXT_CHOICE[quality.choice])}
          aria-label={qualityText}
          title={qualityText}
          className={buttonClasses('secondary', 'md', 'pointer-events-auto absolute end-3 top-16 z-10 px-3!')}
        >
          <Gauge size={20} aria-hidden />
          <span className="hidden text-sm md:inline">{t(`world.qualityLevel.${quality.choice}`)}</span>
        </button>
        <Minimap />
        <Joystick />
        <InteractButton />
        <DialogueBox playerName={character.data?.name ?? ''} />
        <BattlePanel />
        <BossPanel />
        <CoinBurst />
      </div>
    </main>
  )
}
