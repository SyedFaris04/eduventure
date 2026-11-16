import type { Appearance } from '../features/character/appearance'
import type { NpcId } from './map'

/** Villagers use the same character renderer as players, so swapping in real art later stays one place. */
export const NPCS: Record<NpcId, { appearance: Appearance; pages: number }> = {
  elder: {
    pages: 4,
    appearance: {
      body: 'b',
      skin: '#c08356',
      hairStyle: 'buzz',
      hairColour: '#f4f1ea',
      eyes: 'happy',
      face: 'smile',
      top: 'robe_purple',
      bottom: 'trousers_dark',
      shoes: 'boots_brown',
      accessory: 'glasses',
      weapon: 'apprentice_staff',
      backpack: 'none',
    },
  },
  shopkeeper: {
    pages: 2,
    appearance: {
      body: 'a',
      skin: '#f7d0ae',
      hairStyle: 'buns',
      hairColour: '#a0612f',
      eyes: 'sparkle',
      face: 'grin',
      top: 'hoodie_orange',
      bottom: 'skirt_red',
      shoes: 'sneakers_red',
      accessory: 'flower',
      weapon: 'quill',
      backpack: 'satchel',
    },
  },
  // Pak Hamid at the jetty: talking to him opens the list of places to sail to.
  boatman: {
    pages: 1,
    appearance: {
      body: 'c',
      skin: '#9c6440',
      hairStyle: 'short',
      hairColour: '#2b1d14',
      eyes: 'happy',
      face: 'smile',
      top: 'vest_blue',
      bottom: 'trousers_dark',
      shoes: 'sandals',
      accessory: 'headband',
      weapon: 'quill',
      backpack: 'none',
    },
  },
}
