import { describe, expect, it } from 'vitest'
import { isUnlocked, newUnlocks, unlockLevel } from './unlocks'

describe('level unlocks', () => {
  it('second chance opens at level 3', () => {
    expect(isUnlocked(2, 'helper', 'second_chance')).toBe(false)
    expect(isUnlocked(3, 'helper', 'second_chance')).toBe(true)
  })
  it('knows each unlock level', () => {
    expect(unlockLevel('shop_tier', 'epic')).toBe(10)
    expect(unlockLevel('helper', 'fifty')).toBe(8)
    expect(unlockLevel('title', 'nope')).toBeNull()
  })
  it('common items are never gated', () => {
    expect(isUnlocked(1, 'shop_tier', 'common')).toBe(true)
    expect(unlockLevel('shop_tier', 'common')).toBe(1)
  })
  it('lists what a level-up brings', () => {
    expect(newUnlocks(4, 8).map((u) => u.key).sort()).toEqual(['fifty', 'island_bosses', 'rare', 'swift_perahu'])
    expect(newUnlocks(5, 5)).toEqual([])
  })
})
