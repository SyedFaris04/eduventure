import type { useGame } from '../game/store'

type GameState = ReturnType<typeof useGame.getState>
export type BackState = Pick<GameState, 'battle' | 'boss' | 'playerCard' | 'settings' | 'board' | 'workbench' | 'jetty' | 'dialogue'>

// Topmost first. Battles and boss fights are not here: back never skips or closes a question.
const PANELS = [
  ['playerCard', null],
  ['settings', false],
  ['board', false],
  ['workbench', false],
  ['jetty', false],
  ['dialogue', null],
] as const

/** What Android's back button does: close the top panel, go back a page, or leave the app from the first pages. */
export function backAction(s: BackState, path: string): { patch: Partial<BackState> } | 'ignore' | 'back' | 'exit' {
  if (s.battle || s.boss) return 'ignore'
  for (const [key, closed] of PANELS) if (s[key]) return { patch: { [key]: closed } }
  return ['/', '/welcome', '/home'].includes(path) ? 'exit' : 'back'
}
