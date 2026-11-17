import { describe, expect, it } from 'vitest'
import { CATALOGUE } from '../shop/catalogue'
import { shopValues } from '../character/appearance'
import { isPetItem, petForm, petNext } from './petRules'
import { FORM_CASES } from './petCases'

describe('pet form', () => {
  it('follows the strongest subject, or Seimbang when every subject has a fair share', () => {
    for (const [b, form] of FORM_CASES) expect(petForm(b), JSON.stringify(b)).toBe(form)
  })
})

describe('pet next step', () => {
  it('lists what is missing for each step', () => {
    expect(petNext('baby', 100, 5, 50)).toEqual({ next: 'young', points: 100, level: 5, gold: 50, missing: [] })
    expect(petNext('baby', 99, 4, 10).missing).toEqual(['points', 'level', 'gold'])
    expect(petNext('young', 300, 10, 150).next).toBe('adult')
    expect(petNext('young', 300, 10, 149).missing).toEqual(['gold'])
  })
  it('is done at adult', () => {
    expect(petNext('adult', 999, 99, 9999)).toEqual({ next: null, points: 0, level: 0, gold: 0, missing: [] })
  })
})

describe('pet shop items', () => {
  it('has eight pet items, kept apart from the hero slots', () => {
    expect(CATALOGUE.filter(isPetItem)).toHaveLength(8)
    expect(CATALOGUE.filter((i) => !isPetItem(i)).every((i) => !i.slot.startsWith('pet_'))).toBe(true)
    expect(shopValues('accessory').some((id) => id.startsWith('pet_'))).toBe(false)
  })
})
