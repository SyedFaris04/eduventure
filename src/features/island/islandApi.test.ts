import { describe, expect, it } from 'vitest'
import { islandErrorKey } from './islandApi'

describe('island errors', () => {
  it('maps server refusals to messages the player understands', () => {
    expect(islandErrorKey("Doesn't fit there")).toBe('island.notFit')
    expect(islandErrorKey('Not enough materials')).toBe('island.notEnough')
    expect(islandErrorKey('Too many items')).toBe('island.tooMany')
    expect(islandErrorKey('Unlocks at level 10')).toBe('island.locked')
    expect(islandErrorKey("Time's up for today — see you tomorrow!")).toBe('parents.timeUp')
    expect(islandErrorKey('odd')).toBe('island.generic')
  })
})
