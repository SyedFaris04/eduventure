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
  // Crafted at a camp workbench from harvested materials; never sold (the price is a placeholder the shop refuses).
  { id: 'woodcutter_hat', slot: 'accessory', rarity: 'common', price: 1, craft: true },
  { id: 'herb_crown', slot: 'accessory', rarity: 'common', price: 1, craft: true },
  { id: 'crystal_staff', slot: 'weapon', rarity: 'rare', price: 1, craft: true },
  { id: 'rattan_pack', slot: 'backpack', rarity: 'common', price: 1, craft: true },
  { id: 'pet_leaf_hat', slot: 'pet_hat', rarity: 'common', price: 1, craft: true },
  { id: 'pet_crystal_collar', slot: 'pet_neck', rarity: 'rare', price: 1, craft: true },
  { id: 'pet_dye_forest', slot: 'pet_dye', rarity: 'common', price: 1, craft: true },
  // Festival stall: bought with festival tokens while that festival is on (src/features/festival); never sold for gold.
  { id: 'holiday_sunhat', slot: 'accessory', rarity: 'common', price: 1, festival: 'school_holiday', tokens: 30 },
  { id: 'pet_shades', slot: 'pet_hat', rarity: 'common', price: 1, festival: 'school_holiday', tokens: 20 },
  { id: 'lion_dance_hat', slot: 'accessory', rarity: 'common', price: 1, festival: 'cny', tokens: 30 },
  { id: 'pet_lantern', slot: 'pet_neck', rarity: 'common', price: 1, festival: 'cny', tokens: 20 },
  { id: 'songket_top', slot: 'top', rarity: 'common', price: 1, festival: 'raya', tokens: 30 },
  { id: 'pet_ketupat', slot: 'pet_neck', rarity: 'common', price: 1, festival: 'raya', tokens: 20 },
  { id: 'sparkler_wand', slot: 'weapon', rarity: 'common', price: 1, festival: 'merdeka', tokens: 30 },
  { id: 'pet_bunting', slot: 'pet_neck', rarity: 'common', price: 1, festival: 'merdeka', tokens: 20 },
  { id: 'kolam_shawl', slot: 'top', rarity: 'common', price: 1, festival: 'deepavali', tokens: 30 },
  { id: 'pet_marigold', slot: 'pet_neck', rarity: 'common', price: 1, festival: 'deepavali', tokens: 20 },
] as const

export type ShopItem = (typeof CATALOGUE)[number]
export type ShopItemId = ShopItem['id']
export type Rarity = ShopItem['rarity']

/** Items the hero wears (everything outside the pet corner). */
export const HERO_ITEMS = CATALOGUE.filter((i): i is Exclude<ShopItem, { slot: `pet_${string}` }> => !i.slot.startsWith('pet_') && !('craft' in i))
