import { describe, expect, it } from 'vitest'
import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, randomAppearance, sanitizeAppearance } from './appearance'
import { generateSafeName, nameSchema } from './safeName'
import nameParts from './nameParts.json'

describe('appearance helpers', () => {
  it('randomAppearance only picks listed options', () => {
    const a = randomAppearance(() => 0.999)
    for (const [part, value] of Object.entries(a)) {
      expect(APPEARANCE_OPTIONS[part as keyof typeof APPEARANCE_OPTIONS]).toContain(value)
    }
  })
  it('sanitizeAppearance replaces unknown values with defaults', () => {
    expect(sanitizeAppearance({ hairStyle: 'nope', skin: DEFAULT_APPEARANCE.skin }).hairStyle).toBe(DEFAULT_APPEARANCE.hairStyle)
  })
})

describe('safe names', () => {
  it('builds "<first adjective> <first noun>" for rng = 0', () => {
    expect(generateSafeName(() => 0)).toBe(`${nameParts.adjectives[0]} ${nameParts.nouns[0]}`)
  })
  it('name schema rejects too short and too long names', () => {
    expect(nameSchema.safeParse('ab').success).toBe(false)
    expect(nameSchema.safeParse('x'.repeat(17)).success).toBe(false)
    expect(nameSchema.safeParse('Aisyah 07').success).toBe(true)
  })
  it('name schema rejects symbols and contact details', () => {
    expect(nameSchema.safeParse('me@mail.com').success).toBe(false)
    expect(nameSchema.safeParse('<b>hi</b>').success).toBe(false)
  })
})
