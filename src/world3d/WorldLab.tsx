import { DEFAULT_APPEARANCE } from '../features/character/appearance'
import { GameCanvas } from '../features/world/GameCanvas'
import { BUILT_PLACES, type PlaceId } from '../game/places'
import { usePlace } from '../game/placeStore'
import { useQueryClient } from '@tanstack/react-query'
import { festivalsKey } from '../features/festival/festivalApi'

// ?place=science_island shows that place (dev screenshots).
const wanted = new URLSearchParams(location.search).get('place') as PlaceId | null
if (wanted && BUILT_PLACES.includes(wanted)) usePlace.setState({ place: wanted, arriving: true })

// ?festival=cny,merdeka decorates the Kampung for those festivals (dev screenshots).
const festivals = (new URLSearchParams(location.search).get('festival') ?? '').split(',').filter(Boolean)

/** Development-only (/dev/world): the 3D world without signing in, for screenshots and frame-time checks (?fps). */
export default function WorldLab() {
  const queryClient = useQueryClient()
  if (festivals.length && !queryClient.getQueryData(festivalsKey(undefined)))
    queryClient.setQueryData(festivalsKey(undefined), { tokens: 0, festivals: festivals.map((kind) => ({ id: kind, kind, starts_on: '', ends_on: '', preview: true })) })
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#5fb3d9]">
      <GameCanvas hero={DEFAULT_APPEARANCE} />
    </main>
  )
}
