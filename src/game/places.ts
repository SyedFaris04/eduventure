import type { MapSource } from './map'

export type PlaceId = 'greenhaven' | 'science_island' | 'mathematics_mountains' | 'technology_city' | 'language_kingdom'

/** Every place on the jetty list. Maps load on demand so each island is its own download. */
export const PLACES: Record<PlaceId, { built: boolean; load?: () => Promise<MapSource> }> = {
  greenhaven: { built: true, load: () => import('./maps/greenhaven').then((m) => m.GREENHAVEN) },
  science_island: { built: false },
  mathematics_mountains: { built: false },
  technology_city: { built: false }, // project 3
  language_kingdom: { built: false }, // project 4
}

export const BUILT_PLACES = (Object.keys(PLACES) as PlaceId[]).filter((p) => PLACES[p].built)
