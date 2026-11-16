import { DEFAULT_APPEARANCE } from '../features/character/appearance'
import { GameCanvas } from '../features/world/GameCanvas'
import { BUILT_PLACES, type PlaceId } from '../game/places'
import { usePlace } from '../game/placeStore'

// ?place=science_island shows that place (dev screenshots).
const wanted = new URLSearchParams(location.search).get('place') as PlaceId | null
if (wanted && BUILT_PLACES.includes(wanted)) usePlace.setState({ place: wanted, arriving: true })

/** Development-only (/dev/world): the 3D world without signing in, for screenshots and frame-time checks (?fps). */
export default function WorldLab() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#5fb3d9]">
      <GameCanvas hero={DEFAULT_APPEARANCE} />
    </main>
  )
}
