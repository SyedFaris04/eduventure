import type { MapSource } from './map'

export type PlaceId = 'greenhaven' | 'science_island' | 'mathematics_mountains' | 'technology_city' | 'language_kingdom'

/** Every place on the jetty list. Maps load on demand so each island is its own download. */
export const PLACES: Record<PlaceId, { built: boolean; load?: () => Promise<MapSource> }> = {
  greenhaven: { built: true, load: () => import('./maps/greenhaven').then((m) => m.GREENHAVEN) },
  science_island: { built: true, load: () => import('./maps/science_island').then((m) => m.SCIENCE_ISLAND) },
  mathematics_mountains: { built: true, load: () => import('./maps/mathematics_mountains').then((m) => m.MATHEMATICS_MOUNTAINS) },
  technology_city: { built: true, load: () => import('./maps/technology_city').then((m) => m.TECHNOLOGY_CITY) },
  language_kingdom: { built: false }, // project 4
}

export const BUILT_PLACES = (Object.keys(PLACES) as PlaceId[]).filter((p) => PLACES[p].built)
