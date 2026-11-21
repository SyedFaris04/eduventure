import data from '../../../content/island-items.json'
import type { Material } from '../../game/map'

// The island catalogue and placement rules. The server checks the same rules (supabase island_fits); this copy only
// predicts, so the ghost turns red before a refused tap.
export type Category = 'house' | 'garden' | 'trees' | 'paths' | 'lights' | 'furniture' | 'malaysian' | 'water'
export type ItemDef = { id: string; category: Category; cost: Partial<Record<Material, number>>; level: number; w: number; h: number; blocks: boolean }
export type Placed = { id: number; item: string; x: number; y: number; rot: number }

export const ITEMS = data.items as ItemDef[]
export const ITEM: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]))
export const CATEGORIES: Category[] = ['house', 'garden', 'trees', 'paths', 'lights', 'furniture', 'malaysian', 'water']
export const AREA = { x0: 4, y0: 4, x1: 27, y1: 27 }
export const MAX_ITEMS = 400

export const size = (d: ItemDef, rot: number) => (rot % 2 === 0 ? { w: d.w, h: d.h } : { w: d.h, h: d.w })

/** The tiles an item covers, "x,y". */
export function footprint(d: ItemDef, x: number, y: number, rot: number): string[] {
  const { w, h } = size(d, rot)
  const out: string[] = []
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push(`${x + dx},${y + dy}`)
  return out
}

/** Inside the build area and on no other item (`ignore`: the item being moved). */
export function fits(items: Placed[], item: string, x: number, y: number, rot: number, ignore?: number): boolean {
  const d = ITEM[item]
  if (!d) return false
  const { w, h } = size(d, rot)
  if (x < AREA.x0 || y < AREA.y0 || x + w - 1 > AREA.x1 || y + h - 1 > AREA.y1) return false
  const mine = new Set(footprint(d, x, y, rot))
  return !items.some((p) => p.id !== ignore && ITEM[p.item] && footprint(ITEM[p.item], p.x, p.y, p.rot).some((t) => mine.has(t)))
}

/** Where an item goes when a tile is tapped: the footprint is centred on that tile. */
export function centredAt(d: ItemDef, tileX: number, tileY: number, rot: number) {
  const { w, h } = size(d, rot)
  return { x: tileX - Math.floor((w - 1) / 2), y: tileY - Math.floor((h - 1) / 2) }
}

/** Tiles the hero can't walk through. */
export function blockedTiles(items: Placed[]): Set<string> {
  const out = new Set<string>()
  for (const p of items) if (ITEM[p.item]?.blocks) for (const t of footprint(ITEM[p.item], p.x, p.y, p.rot)) out.add(t)
  return out
}
