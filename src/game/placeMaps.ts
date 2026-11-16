import { parseMap, type GameMap } from './map'
import { PLACES, type PlaceId } from './places'

const cache = new Map<PlaceId, Promise<GameMap>>()

/**
 * The parsed map of a place, downloaded once per visit. A failed download is forgotten so Retry fetches again.
 * Components read it with React's `use()` inside Suspense.
 */
export function placeMap(id: PlaceId): Promise<GameMap> {
  let p = cache.get(id)
  if (!p) {
    const load = PLACES[id].load
    p = load ? load().then(parseMap) : Promise.reject(new Error(`${id} is not built yet`))
    cache.set(id, p)
    p.catch(() => cache.delete(id))
  }
  return p
}

export const clearPlaceMaps = () => cache.clear()
