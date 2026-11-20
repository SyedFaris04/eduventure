import type { GameMap, TileKind } from '../../game/map'
import type { FestivalKind } from '../../features/festival/festivalRules'
import { material as m } from '../hero/materials'
import { hash } from '../Props'
import { glow, toParts, type ModelPart, type Part } from './harvestProps'

/**
 * Kampung decorations for each festival, from simple shapes. No religious symbols, no flags or emblems:
 * lanterns and mandarin oranges, pelita and ketupat, bunting in red, white, blue and yellow, kolam and lights.
 */
type Piece = { name: string; near: TileKind[]; count: number; parts: () => Part[] }

const RED = '#d8352a'
const GOLD = '#f2c14e'
const bunting = (colors: string[]): Part[] =>
  colors.map((c, i): Part => ['cone', m(c), [-0.5 + i * 0.2, 1.5, 0], [0.16, 0.3, 0.04], [Math.PI, 0, 0]])

const PIECES: Record<FestivalKind, Piece[]> = {
  school_holiday: [
    {
      name: 'umbrella',
      near: ['path'],
      count: 14,
      parts: () => [
        ['cylinder', m('#f7f1e1'), [0, 0.7, 0], [0.05, 1.4, 0.05]],
        ['cone', m('#ef6c4a'), [0, 1.5, 0], [0.95, 0.32, 0.95]],
        ['cone', m('#fff6e3'), [0, 1.62, 0], [0.42, 0.16, 0.42]],
        ['ring', m('#fff6e3'), [0, 1.36, 0], [0.92, 0.92, 0.12], [Math.PI / 2, 0, 0]],
      ],
    },
    { name: 'beach_ball', near: ['sand', 'path'], count: 10, parts: () => [['sphere', m('#4fa3d9'), [0, 0.2, 0], [0.4, 0.4, 0.4]], ['ring', m('#ffffff'), [0, 0.2, 0], [0.41, 0.41, 0.4]]] },
  ],
  cny: [
    {
      name: 'lantern_post',
      near: ['path'],
      count: 20,
      parts: () => [
        ['cylinder', m('#6b3f22'), [0, 0.8, 0], [0.06, 1.6, 0.06]],
        ['box', m('#6b3f22'), [0.2, 1.6, 0], [0.45, 0.05, 0.05]],
        ['sphere', glow(RED), [0.38, 1.28, 0], [0.32, 0.4, 0.32]],
        ['cylinder', m(GOLD), [0.38, 1.5, 0], [0.16, 0.05, 0.16]],
        ['cylinder', m(GOLD), [0.38, 1.06, 0], [0.16, 0.05, 0.16]],
      ],
    },
    {
      name: 'orange_tree',
      near: ['path'],
      count: 14,
      parts: () => [
        ['cylinder', m('#b5562e'), [0, 0.2, 0], [0.36, 0.4, 0.36]],
        ['sphere', m('#3f8a35'), [0, 0.7, 0], [0.55, 0.5, 0.55]],
        ...[0, 1, 2, 3, 4].map((i): Part => ['sphere', m('#f08a1c'), [Math.cos(i * 1.26) * 0.24, 0.66 + (i % 2) * 0.16, Math.sin(i * 1.26) * 0.24], [0.1, 0.1, 0.1]]),
      ],
    },
  ],
  raya: [
    {
      name: 'pelita',
      near: ['path'],
      count: 28,
      parts: () => [
        ['cylinder', m('#c9a86a'), [0, 0.6, 0], [0.13, 1.2, 0.13]],
        ['ring', m('#8a6a3a'), [0, 0.9, 0], [0.14, 0.14, 0.2], [Math.PI / 2, 0, 0]],
        ['cylinder', m('#5b4426'), [0, 1.24, 0], [0.18, 0.1, 0.18]],
        ['cone', glow('#ffb347'), [0, 1.44, 0], [0.16, 0.34, 0.16]],
        ['octa', m('#d8b54a'), [0.24, 0.85, 0], [0.24, 0.28, 0.24]],
        ['box', m('#4f7a2a'), [0.24, 1.05, 0], [0.03, 0.16, 0.03]],
      ],
    },
  ],
  merdeka: [
    {
      name: 'bunting_post',
      near: ['path'],
      count: 20,
      parts: () => [
        ['cylinder', m('#f7f1e1'), [-0.6, 0.85, 0], [0.05, 1.7, 0.05]],
        ['cylinder', m('#f7f1e1'), [0.6, 0.85, 0], [0.05, 1.7, 0.05]],
        ['box', m('#f7f1e1'), [0, 1.66, 0], [1.2, 0.02, 0.02]],
        ...bunting(['#d8352a', '#ffffff', '#1f4fa3', '#f2c14e', '#d8352a', '#1f4fa3']),
      ],
    },
  ],
  deepavali: [
    {
      name: 'kolam',
      near: ['path'],
      count: 16,
      parts: () => [
        ['cylinder', m('#f7f1e1'), [0, 0.015, 0], [0.9, 0.01, 0.9]],
        ['ring', m('#e8473a'), [0, 0.03, 0], [0.8, 0.8, 0.1], [Math.PI / 2, 0, 0]],
        ['ring', m('#f2c14e'), [0, 0.035, 0], [0.55, 0.55, 0.1], [Math.PI / 2, 0, 0]],
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): Part => ['sphere', m(i % 2 ? '#7e57c2' : '#2fa36b'), [Math.cos(i * 0.785) * 0.3, 0.03, Math.sin(i * 0.785) * 0.3], [0.12, 0.02, 0.12]]),
        ['sphere', m('#e8473a'), [0, 0.03, 0], [0.16, 0.02, 0.16]],
      ],
    },
    {
      name: 'light_post',
      near: ['path'],
      count: 14,
      parts: () => [
        ['cylinder', m('#6b3f22'), [0, 0.85, 0], [0.09, 1.7, 0.09]],
        ...[0, 1, 2, 3, 4].map((i): Part => ['sphere', glow(['#ffd54f', '#ff8a65', '#ba68c8', '#4fc3f7', '#aed581'][i]), [Math.cos(i * 1.3) * 0.1, 0.55 + i * 0.25, Math.sin(i * 1.3) * 0.1], [0.14, 0.14, 0.14]]),
      ],
    },
  ],
}

export type FestivalItem = { x: number; z: number; ry: number; s: number }
export type FestivalPiece = { key: string; parts: ModelPart[]; items: FestivalItem[] }

const OPEN: TileKind[] = ['grass', 'flowers', 'sand']
const cache = new Map<string, ModelPart[]>()

/** Where each festival's pieces stand: open ground beside paths (or sand), spread out, the same every time. */
export function festivalLayout(map: GameMap, kind: FestivalKind, fancy: boolean, taken: { x: number; y: number }[] = []): FestivalPiece[] {
  const free = (x: number, y: number) => {
    const c = map.cells[y]?.[x]
    return Boolean(c) && OPEN.includes(c.tile) && !c.prop && !c.npc && !c.spawn && !c.arrival && !map.blocked(x, y)
  }
  const beside = (x: number, y: number, near: TileKind[]) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => near.includes(map.cells[y + dy]?.[x + dx]?.tile as TileKind))
  return PIECES[kind].map((piece, n) => {
    const want = fancy ? piece.count : Math.ceil(piece.count / 2)
    const spots: { x: number; y: number }[] = []
    for (const near of piece.near) {
      const options: { x: number; y: number; r: number }[] = []
      // Mostly around where players arrive (the hub), with a little randomness so it never looks like a grid.
      const reach = Math.max(map.width, map.height) / 2
      for (let y = 0; y < map.height; y++)
        for (let x = 0; x < map.width; x++)
          if (free(x, y) && beside(x, y, [near])) options.push({ x, y, r: hash(x, y, 7 + n) + Math.hypot(x - map.arrival.x, y - map.arrival.y) / reach })
      options.sort((a, b) => a.r - b.r)
      for (const o of options) {
        if (spots.length >= want) break
        if (taken.some((t) => Math.max(Math.abs(t.x - o.x), Math.abs(t.y - o.y)) < 3)) continue
        spots.push(o)
        taken.push(o)
      }
    }
    let parts = cache.get(`${kind}:${piece.name}`)
    if (!parts) cache.set(`${kind}:${piece.name}`, (parts = toParts(piece.parts())))
    return { key: `${kind}-${piece.name}`, parts, items: spots.map(({ x, y }) => ({ x: x + 0.5, z: y + 0.5, ry: hash(x, y, 3) * 6.283, s: 1 })) }
  })
}

/** Festivals decorate the Kampung (the hub) only. */
export const decoratedKinds = (mapId: string, kinds: FestivalKind[]): FestivalKind[] => (mapId === 'greenhaven' ? kinds : [])

/** Every festival that is on, laid out together. */
export function festivalLayouts(map: GameMap, kinds: FestivalKind[], fancy: boolean): FestivalPiece[] {
  // One list of taken tiles, so festivals that overlap (CNY and Raya in Feb 2027) never stand on the same spot.
  const taken: { x: number; y: number }[] = []
  return kinds.flatMap((k) => festivalLayout(map, k, fancy, taken))
}
