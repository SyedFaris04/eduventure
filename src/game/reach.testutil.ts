import type { Point } from './iso'
import type { GameMap } from './map'

/** Tiles reachable on foot from `from` (4-way, like the pathfinder). Test helper only. */
export function reachable(map: GameMap, from: Point): Set<string> {
  const seen = new Set([`${from.x},${from.y}`])
  const queue = [from]
  while (queue.length) {
    const p = queue.shift()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = { x: p.x + dx, y: p.y + dy }
      const k = `${q.x},${q.y}`
      if (!seen.has(k) && !map.blocked(q.x, q.y)) {
        seen.add(k)
        queue.push(q)
      }
    }
  }
  return seen
}

/** True when a free tile next to (x, y) can be reached — how the player talks to blocking NPCs and bosses. */
export const canStandBeside = (r: Set<string>, x: number, y: number) =>
  [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => r.has(`${x + dx},${y + dy}`))
