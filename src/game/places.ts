import type { MapSource } from './map'

export type PlaceId = 'my_island' | 'greenhaven' | 'science_island' | 'mathematics_mountains' | 'technology_city' | 'language_kingdom'

/** Every place on the jetty list. Maps load on demand so each island is its own download. */
export const PLACES: Record<PlaceId, { built: boolean; private?: boolean; load?: () => Promise<MapSource> }> = {
  // Each player's own island (first on the boat list): private, so no multiplayer room, camp or festival decor.
  my_island: { built: true, private: true, load: () => import('./maps/my_island').then((m) => m.MY_ISLAND) },
  greenhaven: { built: true, load: () => import('./maps/greenhaven').then((m) => m.GREENHAVEN) },
  science_island: { built: true, load: () => import('./maps/science_island').then((m) => m.SCIENCE_ISLAND) },
  mathematics_mountains: { built: true, load: () => import('./maps/mathematics_mountains').then((m) => m.MATHEMATICS_MOUNTAINS) },
  technology_city: { built: true, load: () => import('./maps/technology_city').then((m) => m.TECHNOLOGY_CITY) },
  language_kingdom: { built: true, load: () => import('./maps/language_kingdom').then((m) => m.LANGUAGE_KINGDOM) },
}

export const isPrivatePlace = (id: string) => Boolean(PLACES[id as PlaceId]?.private)

export const BUILT_PLACES = (Object.keys(PLACES) as PlaceId[]).filter((p) => PLACES[p].built)
