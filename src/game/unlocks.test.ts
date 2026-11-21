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
  it('pet egg at 2, young at 5, adult at 10', () => {
    expect(isUnlocked(1, 'pet', 'pet_egg')).toBe(false)
    expect(isUnlocked(2, 'pet', 'pet_egg')).toBe(true)
    expect(unlockLevel('pet', 'pet_young')).toBe(5)
    expect(unlockLevel('pet', 'pet_adult')).toBe(10)
  })
  it('lists what a level-up brings', () => {
    expect(newUnlocks(4, 8).map((u) => u.key).sort()).toEqual(['fifty', 'fountain', 'house_twostorey', 'island_bosses', 'kampung_gate', 'light_arch', 'pet_young', 'rare', 'swift_perahu'])
    expect(newUnlocks(5, 5)).toEqual([])
  })
})
