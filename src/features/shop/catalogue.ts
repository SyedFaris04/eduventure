/**
 * Shop items. Each id is also the appearance value it unlocks in its slot, so the one renderer draws it.
 * The database table `shop_items` holds the same rows (a live test checks they match); the database is
 * what decides prices and ownership.
 */
export const CATALOGUE = [
  { id: 'leaf_crown', slot: 'accessory', rarity: 'common', price: 80 },
  { id: 'scholar_coat', slot: 'top', rarity: 'common', price: 120 },
  { id: 'owl_pack', slot: 'backpack', rarity: 'common', price: 150 },
  { id: 'wizard_hat', slot: 'accessory', rarity: 'rare', price: 500 },
  { id: 'knight_tabard', slot: 'top', rarity: 'rare', price: 500 },
  { id: 'crystal_wand', slot: 'weapon', rarity: 'rare', price: 550 },
  { id: 'steel_sword', slot: 'weapon', rarity: 'rare', price: 600 },
  { id: 'winged_boots', slot: 'shoes', rarity: 'rare', price: 600 },
  { id: 'star_cloak', slot: 'top', rarity: 'epic', price: 2000 },
  { id: 'golden_crown', slot: 'accessory', rarity: 'epic', price: 2000 },
  { id: 'golden_quill', slot: 'weapon', rarity: 'epic', price: 2200 },
] as const

export type ShopItem = (typeof CATALOGUE)[number]
export type ShopItemId = ShopItem['id']
export type Rarity = ShopItem['rarity']
