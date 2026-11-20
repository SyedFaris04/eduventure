import { describe, expect, it } from 'vitest'
import { HERO_ITEMS } from '../shop/catalogue'
import { PET_ITEMS } from '../shop/PetCorner'
import { FESTIVAL_ITEMS, FESTIVAL_KINDS, untilLabel } from './festivalRules'
import { festivalErrorKey } from './festivalApi'

describe('festival rules', () => {
  it('each festival has its hero item, then its pet item, worth 50 tokens together', () => {
    expect(FESTIVAL_ITEMS('cny').map((i) => i.id)).toEqual(['lion_dance_hat', 'pet_lantern'])
    for (const k of FESTIVAL_KINDS) {
      const items = FESTIVAL_ITEMS(k)
      expect(items).toHaveLength(2)
      expect(items[0].slot.startsWith('pet_')).toBe(false)
      expect(items[1].slot.startsWith('pet_')).toBe(true)
      expect(items.reduce((n, i) => n + i.tokens, 0)).toBe(50)
    }
  })

  it('the gold shop and the pet corner never list festival items', () => {
    expect(HERO_ITEMS.some((i) => 'festival' in i)).toBe(false)
    expect(PET_ITEMS.some((i) => 'festival' in i)).toBe(false)
  })

  it('shows a calm end date', () => {
    expect(untilLabel('2027-01-03', 'en-GB')).toBe('3 Jan')
  })

  it('turns server refusals into messages', () => {
    expect(festivalErrorKey('This festival is not on right now')).toBe('festival.errors.off')
    expect(festivalErrorKey('You already own this item')).toBe('shop.errors.owned')
    expect(festivalErrorKey('Not enough festival tokens')).toBe('festival.errors.tokens')
    expect(festivalErrorKey('boom')).toBe('shop.errors.failed')
  })
})
