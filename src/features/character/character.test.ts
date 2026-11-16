import { describe, expect, it } from 'vitest'
import { renderCharacterSvg, LAYERS } from './renderCharacterSvg'
import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, randomAppearance, sanitizeAppearance } from './appearance'
import { generateSafeName, nameSchema } from './safeName'
import nameParts from './nameParts.json'

const layerMarkup = (svg: string, layer: string) => svg.match(new RegExp(`<g id="layer-${layer}"[\\s\\S]*?<!--/${layer}-->`))?.[0]

describe('renderCharacterSvg', () => {
  it('draws all 11 layers in back-to-front order', () => {
    const svg = renderCharacterSvg(DEFAULT_APPEARANCE)
    const order = [...svg.matchAll(/id="layer-([a-z]+)"/g)].map((m) => m[1])
    expect(order).toEqual(['backpack', 'body', 'bottom', 'shoes', 'top', 'head', 'face', 'eyes', 'hair', 'accessory', 'weapon'])
    expect(LAYERS).toEqual(order)
  })

  it('changes only the hair layer when the hair colour changes', () => {
    const a = renderCharacterSvg(DEFAULT_APPEARANCE)
    const b = renderCharacterSvg({ ...DEFAULT_APPEARANCE, hairColour: APPEARANCE_OPTIONS.hairColour.find((c) => c !== DEFAULT_APPEARANCE.hairColour)! })
    for (const layer of LAYERS) {
      if (layer === 'hair') expect(layerMarkup(a, layer)).not.toEqual(layerMarkup(b, layer))
      else expect(layerMarkup(a, layer), layer).toEqual(layerMarkup(b, layer))
    }
  })

  it('renders every option of every part without throwing', () => {
    for (const [part, options] of Object.entries(APPEARANCE_OPTIONS)) {
      for (const value of options) {
        expect(() => renderCharacterSvg({ ...DEFAULT_APPEARANCE, [part]: value })).not.toThrow()
      }
    }
  })

  it('never lets an unknown value reach the markup', () => {
    const hostile = { ...DEFAULT_APPEARANCE, hairColour: '"><script>alert(1)</script>', top: 'evil' } as never
    const svg = renderCharacterSvg(hostile)
    expect(svg).not.toContain('<script')
    expect(svg).not.toContain('evil')
  })
})

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
