import type { Point } from './iso'

export type TileKind = 'grass' | 'flowers' | 'path' | 'sand' | 'water' | 'bridge' | 'jetty' | 'snow' | 'stone' | 'mud'
export type PropKind =
  | 'tree' | 'bush' | 'rock' | 'fence' | 'well' | 'house'
  | 'palm' | 'kampung_house' | 'stall' | 'fern' | 'mangrove' | 'mushroom' | 'pine_snow' | 'pillar' | 'sundial' | 'abacus_gate'
export type MonsterKind = 'sproutling' | 'pebblewing' | 'dinobud' | 'hornbill' | 'tapir' | 'pangolin' | 'cubelet' | 'hexowl' | 'pisnake'
export type NpcId = 'elder' | 'shopkeeper' | 'boatman'

export type BossId = 'guardian' | 'raja_rafflesia' | 'abacus_titan'
export type Theme = 'kampung' | 'rainforest' | 'alpine'
/** A named stretch of a place (inclusive tile rectangle), shown in a banner when the player walks in. */
export type Area = { name: string; x0: number; y0: number; x1: number; y1: number }
export type Cell = { tile: TileKind; prop?: PropKind; blocks?: boolean; spawn?: 'player'; arrival?: true; npc?: NpcId; zone?: MonsterKind; boss?: BossId }
export type MapSource = {
  id: string
  theme: Theme
  /** How many of each monster wander the place. */
  monsters: Partial<Record<MonsterKind, number>>
  areas: Area[]
  legend: Record<string, Cell>
  rows: string[]
}

export type GameMap = {
  id: string
  theme: Theme
  width: number
  height: number
  cells: Cell[][] // [y][x]
  blocked: (x: number, y: number) => boolean
  spawn: Point
  /** Where the boat drops the player (the spawn when a map has no arrival cell). */
  arrival: Point
  monsterCounts: Partial<Record<MonsterKind, number>>
  areas: Area[]
  npcs: { id: NpcId; x: number; y: number }[]
  bosses: { id: BossId; x: number; y: number }[]
  props: { kind: PropKind; x: number; y: number }[]
  monsterZones: Partial<Record<MonsterKind, Point[]>>
}

export function parseMap(src: MapSource): GameMap {
  const height = src.rows.length
  const width = src.rows[0].length
  const cells = src.rows.map((row, y) =>
    [...row].map((ch, x) => {
      const cell = src.legend[ch]
      if (!cell) throw new Error(`Unknown map character "${ch}" at ${x},${y}`)
      return cell
    }),
  )
  let spawn: Point | null = null
  let arrival: Point | null = null
  const npcs: GameMap['npcs'] = []
  const bosses: GameMap['bosses'] = []
  const props: GameMap['props'] = []
  const monsterZones: GameMap['monsterZones'] = {}
  cells.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c.spawn) spawn = { x, y }
      if (c.arrival) arrival = { x, y }
      if (c.npc) npcs.push({ id: c.npc, x, y })
      if (c.boss) bosses.push({ id: c.boss, x, y })
      if (c.prop) props.push({ kind: c.prop, x, y })
      if (c.zone) (monsterZones[c.zone] ??= []).push({ x, y })
    }),
  )
  if (!spawn) throw new Error('Map has no player spawn')
  const blocked = (x: number, y: number) => {
    const cx = Math.floor(x)
    const cy = Math.floor(y)
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) return true
    return Boolean(cells[cy][cx].blocks)
  }
  return { id: src.id, theme: src.theme, width, height, cells, blocked, spawn, arrival: arrival ?? spawn, monsterCounts: src.monsters, areas: src.areas, npcs, bosses, props, monsterZones }
}

/** Name of the area containing a (fractional) grid point; the first listed area wins where they overlap. */
export function areaAt(map: GameMap, p: Point): string | null {
  const x = Math.floor(p.x)
  const y = Math.floor(p.y)
  return map.areas.find((a) => x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1)?.name ?? null
}
