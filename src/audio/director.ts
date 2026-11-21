import { setMusicLevel, setMusicMood, unlockAudio } from './engine'
import { useAudioSettings } from './settings'
import { useGame } from '../game/store'
import { usePlace } from '../game/placeStore'
import type { Mood } from './theory'

const ISLAND_MOOD: Record<string, Mood> = { kampung: 'kampung', rainforest: 'rainforest', alpine: 'alpine', tech: 'tech', kingdom: 'kingdom', cozy: 'cozy' }

/**
 * Which music plays where: each island has its mood in the world; everywhere else plays the calm study mood.
 * Battles and lessons play at half volume so the question stays the focus.
 */
export function musicFor(path: string, islandTheme: string, panelOpen: boolean): { mood: Mood; level: number } {
  if (path === '/world') return { mood: ISLAND_MOOD[islandTheme] ?? 'kampung', level: panelOpen ? 0.5 : 1 }
  const inLesson = /^\/(academy|hall)\/[^/]+\/[^/]+$/.test(path)
  return { mood: 'study', level: inLesson ? 0.5 : 1 }
}

// ---------------------------------------------------------------------------------------------------------------
// Runtime: follow the page, the island and open panels; start on the first tap (browsers need one).
// ---------------------------------------------------------------------------------------------------------------

export const PLACE_THEME: Record<string, string> = {
  greenhaven: 'kampung',
  science_island: 'rainforest',
  mathematics_mountains: 'alpine',
  technology_city: 'tech',
  language_kingdom: 'kingdom',
  my_island: 'cozy',
}
let speaking = false

/** While a word is spoken in the Language Hall the music steps back further. */
export function setSpeaking(on: boolean) {
  speaking = on
  update()
}

let path = '/'
let started = false
function update() {
  if (!started || useAudioSettings.getState().muted) return
  const g = useGame.getState()
  const { mood, level } = musicFor(path, PLACE_THEME[usePlace.getState().place] ?? 'kampung', Boolean(g.battle || g.boss))
  const target = speaking ? Math.min(level, 0.2) : level
  // The game store changes every frame or so: only touch the audio when something it cares about changed.
  if (mood === last.mood && target === last.level) return
  last = { mood, level: target }
  void setMusicMood(mood)
  setMusicLevel(target)
}
let last: { mood: Mood | null; level: number } = { mood: null, level: -1 }

export function startMusicDirector(router: { state: { location: { pathname: string } }; subscribe: (fn: (s: { location: { pathname: string } }) => void) => unknown }) {
  path = router.state.location.pathname
  router.subscribe((s) => {
    path = s.location.pathname
    update()
  })
  useGame.subscribe(update)
  usePlace.subscribe(update)
  useAudioSettings.subscribe(update)
  const first = () => {
    started = true
    unlockAudio()
    update()
  }
  window.addEventListener('pointerdown', first)
  window.addEventListener('keydown', first)
}
