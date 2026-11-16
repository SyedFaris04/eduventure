import { create } from 'zustand'
import { PLACES, type PlaceId } from './places'

const KEY = 'eduventure.place'

/** The remembered place, or Greenhaven for anything unknown, unbuilt or unreadable. */
export function loadPlace(): PlaceId {
  try {
    const v = localStorage.getItem(KEY) as PlaceId | null
    if (v && v in PLACES && PLACES[v].built) return v
  } catch {
    // storage blocked: start at the hub
  }
  return 'greenhaven'
}

/** Where the player is. `arriving` means they came by boat, so they start on the jetty. */
export const usePlace = create<{ place: PlaceId; arriving: boolean }>(() => ({ place: loadPlace(), arriving: loadPlace() !== 'greenhaven' }))

export function setPlace(place: PlaceId) {
  try {
    localStorage.setItem(KEY, place)
  } catch {
    // not remembered across reloads; still travel now
  }
  usePlace.setState({ place, arriving: true })
}
