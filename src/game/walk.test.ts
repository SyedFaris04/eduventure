import { describe, expect, it } from 'vitest'
import { parseMap } from './map'
import { GREENHAVEN } from './maps/greenhaven'
import { followPath, INTERACT_RANGE, tapGoal } from './movement'

describe('tap to walk on Greenhaven', () => {
  const map = parseMap(GREENHAVEN)
  const elder = map.npcs.find((n) => n.id === 'elder')!

  it('walks from the spawn to within talking range of the Elder', () => {
    let pos = { x: map.spawn.x + 0.5, y: map.spawn.y + 0.5 }
    const goal = tapGoal({ x: elder.x, y: elder.y }, { x: Math.floor(pos.x), y: Math.floor(pos.y) }, map.blocked)!
    expect(goal).not.toBeNull()
    let state = { pos, path: goal }
    for (let i = 0; i < 60 * 20 && state.path.length; i++) state = followPath(state.pos, state.path, 1 / 60, map.blocked)
    pos = state.pos
    expect(state.path).toEqual([])
    // Ends side-by-side (distance 1), well inside the talking range.
    const distance = Math.hypot(elder.x + 0.5 - pos.x, elder.y + 0.5 - pos.y)
    expect(distance).toBeLessThan(1.1) // waypoints count as reached within 0.08 tiles
    expect(distance).toBeLessThanOrEqual(INTERACT_RANGE)
  })
})
