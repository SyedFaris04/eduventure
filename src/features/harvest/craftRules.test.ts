import { describe, expect, it } from 'vitest'
import { canAfford, giveAmount } from './craftRules'

const have = { wood: 5, stone: 2, herbs: 0, crystal: 0 }

describe('craft rules (display only; the server decides)', () => {
  it('can afford a recipe only with every material covered', () => {
    expect(canAfford({ wood: 4, stone: 2 }, have)).toBe(true)
    expect(canAfford({ wood: 4, stone: 3 }, have)).toBe(false)
    expect(canAfford({ herbs: 1 }, undefined)).toBe(false)
  })

  it('gives what the player has, never more than the camp still needs', () => {
    expect(giveAmount(5, 40, 0)).toBe(5)
    expect(giveAmount(50, 40, 38)).toBe(2)
    expect(giveAmount(0, 40, 0)).toBe(0)
    expect(giveAmount(5, 40, 40)).toBe(0)
  })
})
