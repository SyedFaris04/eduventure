import { DEFAULT_APPEARANCE } from '../features/character/appearance'
import { GameCanvas } from '../features/world/GameCanvas'

/** Development-only (/dev/world): the 3D world without signing in, for screenshots and frame-time checks (?fps). */
export default function WorldLab() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#5fb3d9]">
      <GameCanvas hero={DEFAULT_APPEARANCE} />
    </main>
  )
}
