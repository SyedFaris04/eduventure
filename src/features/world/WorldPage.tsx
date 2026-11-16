import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { House } from 'lucide-react'
import { buttonClasses } from '../../components/ui'
import { useSession } from '../authentication/useSession'
import { useMyCharacter, useProgression } from '../character/useCharacter'
import { GameCanvas } from './GameCanvas'
import { Hud } from './Hud'
import { Minimap } from './Minimap'
import { InteractButton, Joystick } from './TouchControls'
import { DialogueBox } from './DialogueBox'
import { BattlePanel } from '../battle/BattlePanel'

export function WorldPage() {
  const { t } = useTranslation()
  const { session } = useSession()
  const uid = session?.user.id
  const character = useMyCharacter(uid)
  const progression = useProgression(uid)

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#5fb3d9] select-none">
      {character.data && <GameCanvas hero={character.data.appearance} />}
      {/* Overlays ignore pointer events except on their own controls, so taps reach the map. */}
      <div className="pointer-events-none absolute inset-0">
        {character.data && <Hud character={character.data} xp={progression.data?.xp ?? 0} gold={progression.data?.gold ?? 0} />}
        <Link to="/home" aria-label={t('world.home')} className={buttonClasses('secondary', 'md', 'pointer-events-auto absolute end-3 top-3 z-10 px-3!')}>
          <House size={20} aria-hidden />
        </Link>
        <Minimap />
        <Joystick />
        <InteractButton />
        <DialogueBox playerName={character.data?.name ?? ''} />
        <BattlePanel />
      </div>
    </main>
  )
}
