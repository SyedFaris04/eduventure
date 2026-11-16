import type { Point } from './iso'

export type TileKind = 'grass' | 'flowers' | 'path' | 'sand' | 'water' | 'bridge'
export type PropKind = 'tree' | 'bush' | 'rock' | 'fence' | 'well' | 'house'
export type MonsterKind = 'sproutling' | 'pebblewing' | 'dinobud'
export type NpcId = 'elder' | 'shopkeeper'

export type BossId = 'guardian'
export type Cell = { tile: TileKind; prop?: PropKind; blocks?: boolean; spawn?: 'player'; npc?: NpcId; zone?: MonsterKind; boss?: BossId }
export type MapSource = { id: string; legend: Record<string, Cell>; rows: string[] }

export type GameMap = {
  id: string
  width: number
  height: number
  cells: Cell[][] // [y][x]
  blocked: (x: number, y: number) => boolean
  spawn: Point
  npcs: { id: NpcId; x: number; y: number }[]
  bosses: { id: BossId; x: number; y: number }[]
  props: { kind: PropKind; x: number; y: number }[]
  monsterZones: Record<MonsterKind, Point[]>
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
  const npcs: GameMap['npcs'] = []
  const bosses: GameMap['bosses'] = []
  const props: GameMap['props'] = []
  const monsterZones: GameMap['monsterZones'] = { sproutling: [], pebblewing: [], dinobud: [] }
  cells.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c.spawn) spawn = { x, y }
      if (c.npc) npcs.push({ id: c.npc, x, y })
      if (c.boss) bosses.push({ id: c.boss, x, y })
      if (c.prop) props.push({ kind: c.prop, x, y })
      if (c.zone) monsterZones[c.zone].push({ x, y })
    }),
  )
  if (!spawn) throw new Error('Map has no player spawn')
  const blocked = (x: number, y: number) => {
    const cx = Math.floor(x)
    const cy = Math.floor(y)
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) return true
    return Boolean(cells[cy][cx].blocks)
  }
  return { id: src.id, width, height, cells, blocked, spawn, npcs, bosses, props, monsterZones }
}
