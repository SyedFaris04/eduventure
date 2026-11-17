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
  // Pet corner: worn by the knowledge pet (src/features/pet).
  { id: 'pet_songkok', slot: 'pet_hat', rarity: 'common', price: 60 },
  { id: 'pet_flower', slot: 'pet_hat', rarity: 'common', price: 60 },
  { id: 'pet_tengkolok', slot: 'pet_hat', rarity: 'rare', price: 300 },
  { id: 'pet_batik', slot: 'pet_neck', rarity: 'common', price: 80 },
  { id: 'pet_bell', slot: 'pet_neck', rarity: 'common', price: 50 },
  { id: 'pet_dye_ocean', slot: 'pet_dye', rarity: 'common', price: 100 },
  { id: 'pet_dye_rose', slot: 'pet_dye', rarity: 'common', price: 100 },
  { id: 'pet_dye_gold', slot: 'pet_dye', rarity: 'epic', price: 900 },
] as const

export type ShopItem = (typeof CATALOGUE)[number]
export type ShopItemId = ShopItem['id']
export type Rarity = ShopItem['rarity']
