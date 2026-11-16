import { describe, expect, it } from 'vitest'
import { levelForXp, levelProgress, xpToNext } from './levels'

describe('level curve', () => {
  it('needs round(100 · n^1.5) XP to go from level n to n+1', () => {
    expect(xpToNext(1)).toBe(100)
    expect(xpToNext(2)).toBe(283)
    expect(xpToNext(10)).toBe(3162)
  })
  it('maps total XP to a level', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(99)).toBe(1)
    expect(levelForXp(100)).toBe(2)
    expect(levelForXp(382)).toBe(2)
    expect(levelForXp(383)).toBe(3)
  })
  it('reports progress inside the current level for the XP bar', () => {
    expect(levelProgress(150)).toEqual({ level: 2, into: 50, needed: 283 })
  })
})
