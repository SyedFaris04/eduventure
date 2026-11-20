import { describe, expect, it } from 'vitest'
import { harvestErrorKey, regrowingSet } from './harvestApi'

describe('harvest helpers', () => {
  it('maps server errors to messages the player understands', () => {
    expect(harvestErrorKey('Still regrowing')).toBe('harvest.errors.regrowing')
    expect(harvestErrorKey('You need a pickaxe for crystal')).toBe('harvest.errors.pickaxe')
    expect(harvestErrorKey('Too fast: take a moment to read the question')).toBe('battle.errors.tooFast')
    expect(harvestErrorKey("Time's up for today — see you tomorrow!")).toBe('parents.timeUp')
    expect(harvestErrorKey('Not enough wood')).toBe('harvest.errors.notEnough')
    expect(harvestErrorKey('something odd')).toBe('battle.errors.generic')
  })

  it('lists only the nodes still regrowing', () => {
    const now = Date.parse('2026-11-20T10:00:00Z')
    const set = regrowingSet([{ x: 3, y: 4, ready_at: '2026-11-20T10:02:00Z' }, { x: 5, y: 6, ready_at: '2026-11-20T09:59:00Z' }], now)
    expect([...set]).toEqual(['3,4'])
  })
})
