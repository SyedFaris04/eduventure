import { describe, expect, it } from 'vitest'
import { CATALOGUE } from '../shop/catalogue'
import { shopValues } from '../character/appearance'
import { isPetItem, petForm, petNext } from './petRules'

/** Shared with tests/rls/pet.test.ts, which checks the database gives the same answers. */
export const FORM_CASES = [
  [{ science: 10, maths: 3, technology: 0, language: 0 }, 'science'],
  [{ science: 25, maths: 25, technology: 25, language: 25 }, 'seimbang'],
  [{ science: 20, maths: 20, technology: 20, language: 19 }, 'seimbang'],
  [{ science: 30, maths: 20, technology: 20, language: 15 }, 'science'],
  [{ science: 0, maths: 0, technology: 0, language: 0 }, 'seimbang'],
  [{ science: 5, maths: 9, technology: 9, language: 0 }, 'maths'],
] as const
export const NEXT_CASES = [
  ['baby', 100, 5, 50],
  ['baby', 99, 4, 10],
  ['baby', 100, 4, 50],
  ['young', 300, 10, 150],
  ['young', 300, 10, 149],
  ['adult', 999, 99, 9999],
] as const

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
