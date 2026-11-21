/** Three swings at the same node harvest it; another node, or a pause over 3 seconds, starts the count again. */
export const HITS = 3
const PAUSE_MS = 3000

export type SlashState = { key: string | null; hits: number; at: number }
export const START: SlashState = { key: null, hits: 0, at: 0 }

export function slashStep(s: SlashState, key: string, now: number): { state: SlashState; done: boolean } {
  const hits = s.key === key && now - s.at <= PAUSE_MS ? s.hits + 1 : 1
  return hits >= HITS ? { state: { key, hits: 0, at: now }, done: true } : { state: { key, hits, at: now }, done: false }
}
