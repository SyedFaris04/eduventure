import { DEFAULT_APPEARANCE } from '../features/character/appearance'
import { GameCanvas } from '../features/world/GameCanvas'
import { BUILT_PLACES, type PlaceId } from '../game/places'
import { usePlace } from '../game/placeStore'
import { useQueryClient } from '@tanstack/react-query'
import { festivalsKey } from '../features/festival/festivalApi'
import { campKey } from '../features/harvest/harvestApi'
import { islandKey } from '../features/island/islandApi'
import { fits, ITEMS, size, type Placed } from '../features/island/rules'

// ?place=science_island shows that place (dev screenshots).
const wanted = new URLSearchParams(location.search).get('place') as PlaceId | null
if (wanted && BUILT_PLACES.includes(wanted)) usePlace.setState({ place: wanted, arriving: true })

// ?festival=cny,merdeka decorates the Kampung for those festivals (dev screenshots).
const festivals = (new URLSearchParams(location.search).get('festival') ?? '').split(',').filter(Boolean)

// ?camp shows every camp build finished (the whiteboard with its notes); ?at=26,10 starts the hero on that tile.
const camp = new URLSearchParams(location.search).has('camp')

// ?place=my_island&showcase lays every island item out in rows (screenshots of all the models).
const showcase = new URLSearchParams(location.search).has('showcase')
function showcaseItems(): Placed[] {
  const out: Placed[] = []
  let x = 4
  let y = 4
  let rowH = 1
  for (const d of ITEMS) {
    const { w, h } = size(d, 0)
    if (x + w - 1 > 27) {
      x = 4
      y += rowH + 1
      rowH = 1
    }
    if (fits(out, d.id, x, y, 0)) out.push({ id: out.length + 1, item: d.id, x, y, rot: 0 })
    x += w + 1
    rowH = Math.max(rowH, h)
  }
  return out
}
const at = new URLSearchParams(location.search).get('at')?.split(',').map(Number)
if (at?.length === 2) usePlace.setState({ resumeAt: { x: at[0], y: at[1] } })

/** Development-only (/dev/world): the 3D world without signing in, for screenshots and frame-time checks (?fps). */
export default function WorldLab() {
  const queryClient = useQueryClient()
  if (festivals.length && !queryClient.getQueryData(festivalsKey(undefined)))
    queryClient.setQueryData(festivalsKey(undefined), { tokens: 0, festivals: festivals.map((kind) => ({ id: kind, kind, starts_on: '', ends_on: '', preview: true })) })
  const place = usePlace((s) => s.place)
  if (showcase && !queryClient.getQueryData(islandKey(undefined))) queryClient.setQueryData(islandKey(undefined), showcaseItems())
  if (camp && !queryClient.getQueryData(campKey(place)))
    queryClient.setQueryData(campKey(place), ['camp_bench', 'camp_lantern', 'camp_flag', 'whiteboard'].map((project) => ({ project, cost: {}, built: true, given: {}, mine: 0 })))
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#5fb3d9]">
      <GameCanvas hero={DEFAULT_APPEARANCE} />
    </main>
  )
}
