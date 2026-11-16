/** Every customizable part and its allowed values. Values are short ids or lowercase hex (the database checks this shape). */
export const APPEARANCE_OPTIONS = {
  body: ['a', 'b', 'c'],
  skin: ['#ffe0c4', '#f7d0ae', '#eab894', '#d9a074', '#c08356', '#9c6440', '#7b4a2e', '#5a3521'],
  hairStyle: ['spiky', 'short', 'bob', 'long', 'ponytail', 'buns', 'curly', 'afro', 'braid', 'buzz', 'hijab'],
  hairColour: ['#2b1d14', '#4a2f1d', '#6b3e22', '#a0612f', '#d9a35b', '#f2d38a', '#c94f3d', '#8a8f99', '#f4f1ea', '#6c8ce0', '#e88fb4', '#7cc04a'],
  eyes: ['round', 'happy', 'sparkle', 'sleepy', 'determined'],
  face: ['smile', 'grin', 'calm', 'surprised', 'cheeky'],
  top: ['tunic_green', 'vest_blue', 'hoodie_orange', 'robe_purple', 'dress_pink', 'scarf_red'],
  bottom: ['shorts_brown', 'trousers_dark', 'skirt_red', 'leggings_blue'],
  shoes: ['boots_brown', 'sneakers_red', 'sandals', 'boots_black'],
  accessory: ['none', 'flower', 'glasses', 'grad_cap', 'headband', 'star_clip'],
  weapon: ['wooden_sword', 'short_bow', 'apprentice_staff', 'quill'],
  backpack: ['none', 'satchel', 'explorer', 'book_bag', 'scroll_case'],
} as const

type Options = typeof APPEARANCE_OPTIONS
export type AppearancePart = keyof Options
export type Appearance = { [K in AppearancePart]: Options[K][number] }

export const PART_ORDER = Object.keys(APPEARANCE_OPTIONS) as AppearancePart[]

export const DEFAULT_APPEARANCE: Appearance = {
  body: 'a',
  skin: '#eab894',
  hairStyle: 'spiky',
  hairColour: '#4a2f1d',
  eyes: 'round',
  face: 'smile',
  top: 'scarf_red',
  bottom: 'trousers_dark',
  shoes: 'boots_brown',
  accessory: 'none',
  weapon: 'wooden_sword',
  backpack: 'explorer',
}

const pick = <T,>(list: readonly T[], rng: () => number) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))]

export function randomAppearance(rng: () => number = Math.random): Appearance {
  return Object.fromEntries(PART_ORDER.map((part) => [part, pick(APPEARANCE_OPTIONS[part], rng)])) as Appearance
}

/** Anything not in the option lists (old saves, tampered data) falls back to the default for that part. */
export function sanitizeAppearance(input: Partial<Record<string, unknown>> | null | undefined): Appearance {
  return Object.fromEntries(
    PART_ORDER.map((part) => {
      const value = input?.[part]
      return [part, (APPEARANCE_OPTIONS[part] as readonly unknown[]).includes(value) ? value : DEFAULT_APPEARANCE[part]]
    }),
  ) as Appearance
}
