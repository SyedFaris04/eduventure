import Phaser from 'phaser'
import type { GameMap, TileKind } from '../map'
import { gridToScreen, TILE_H, TILE_W } from '../iso'

/**
 * Procedural art in the reference style: soft dark-brown outlines, two-tone shading, pastel palette.
 * Everything here is placeholder art drawn in code; docs/art-spec.md lists the files that replace it.
 */
const INK = 0x3b2a1e
const C = {
  grass: [0x8bc34a, 0x86bd45, 0x90c851],
  grassBlade: 0x6fa83d,
  grassLight: 0xa6d672,
  flowers: [0xf7a8c4, 0xfff6e3, 0xf7c843],
  path: 0xf2b872,
  pathDark: 0xd9894a,
  pebble: 0xe5a560,
  sand: 0xf5dca0,
  sandDark: 0xe2c27f,
  water: 0x7ccbe8,
  waterDeep: 0x5ab4d8,
  bridge: 0xb98252,
  bridgeDark: 0x8a5a3b,
  cliffLeft: 0xa47a4f,
  cliffRight: 0x8a5f3b,
}
const SIDE = 18 // cliff depth in px
const SINK = 6 // water sits below the land

/** Deterministic per-tile noise so the map looks the same on every load. */
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

export type WorldLayout = { ox: number; oy: number; width: number; height: number }

/** Pixel offset that puts the whole map in positive coordinates, plus its size. */
export function layoutFor(map: GameMap): WorldLayout {
  const ox = map.height * (TILE_W / 2) + 96
  const oy = 120
  return { ox, oy, width: (map.width + map.height) * (TILE_W / 2) + 192, height: (map.width + map.height) * (TILE_H / 2) + oy + 120 }
}

const diamond = (cx: number, cy: number, dy = 0) => [
  new Phaser.Math.Vector2(cx, cy - TILE_H / 2 + dy),
  new Phaser.Math.Vector2(cx + TILE_W / 2, cy + dy),
  new Phaser.Math.Vector2(cx, cy + TILE_H / 2 + dy),
  new Phaser.Math.Vector2(cx - TILE_W / 2, cy + dy),
]

/** Paints every ground tile into one texture (fast on phones) and returns the water glint layer. */
export function paintGround(scene: Phaser.Scene, map: GameMap, L: WorldLayout) {
  const g = scene.make.graphics({}, false)
  const isLow = (x: number, y: number) => x < 0 || y < 0 || x >= map.width || y >= map.height || map.cells[y][x].tile === 'water'
  const centre = (x: number, y: number) => {
    const s = gridToScreen({ x: x + 0.5, y: y + 0.5 })
    return { cx: L.ox + s.x, cy: L.oy + s.y }
  }

  // 1. Water first (sunken), so land cliffs can overlap it.
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (map.cells[y][x].tile !== 'water') continue
      const { cx, cy } = centre(x, y)
      g.fillStyle(hash(x, y) > 0.5 ? C.water : C.waterDeep, 1)
      g.fillPoints(diamond(cx, cy, SINK), true)
    }

  // 2. Land, back to front, with cliff faces wherever the neighbour in front is water or the map edge.
  for (let s = 0; s < map.width + map.height - 1; s++)
    for (let y = 0; y < map.height; y++) {
      const x = s - y
      if (x < 0 || x >= map.width) continue
      const tile = map.cells[y][x].tile
      if (tile === 'water') continue
      const { cx, cy } = centre(x, y)
      const r = hash(x, y)
      const depth = x === map.width - 1 || y === map.height - 1 ? SIDE * 2 : SIDE
      if (isLow(x, y + 1) && tile !== 'bridge') {
        g.fillStyle(C.cliffLeft, 1)
        g.fillPoints([new Phaser.Math.Vector2(cx - TILE_W / 2, cy), new Phaser.Math.Vector2(cx, cy + TILE_H / 2), new Phaser.Math.Vector2(cx, cy + TILE_H / 2 + depth), new Phaser.Math.Vector2(cx - TILE_W / 2, cy + depth)], true)
      }
      if (isLow(x + 1, y) && tile !== 'bridge') {
        g.fillStyle(C.cliffRight, 1)
        g.fillPoints([new Phaser.Math.Vector2(cx, cy + TILE_H / 2), new Phaser.Math.Vector2(cx + TILE_W / 2, cy), new Phaser.Math.Vector2(cx + TILE_W / 2, cy + depth), new Phaser.Math.Vector2(cx, cy + TILE_H / 2 + depth)], true)
      }
      paintTop(g, tile, cx, cy, r, x, y)
    }

  const rt = scene.add.renderTexture(0, 0, L.width, L.height).setOrigin(0, 0).setDepth(-100000)
  rt.draw(g)
  g.destroy()

  // 3. Water glints on their own layer so they can shimmer.
  const glint = scene.add.graphics().setDepth(-99999)
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (map.cells[y][x].tile !== 'water' || hash(x + 7, y) < 0.45) continue
      const { cx, cy } = centre(x, y)
      glint.lineStyle(2, 0xffffff, 0.75)
      glint.beginPath()
      glint.moveTo(cx - 10, cy + SINK)
      glint.lineTo(cx + 2, cy + SINK - 3)
      glint.strokePath()
    }
  return glint
}

function paintTop(g: Phaser.GameObjects.Graphics, tile: TileKind, cx: number, cy: number, r: number, x: number, y: number) {
  const pts = diamond(cx, cy)
  switch (tile) {
    case 'path':
      g.fillStyle(C.path, 1).fillPoints(pts, true)
      g.fillStyle(C.pebble, 1)
      for (let i = 0; i < 3; i++) g.fillEllipse(cx + (hash(x + i, y) - 0.5) * 34, cy + (hash(x, y + i) - 0.5) * 14, 6, 3)
      g.lineStyle(1, C.pathDark, 0.35).strokePoints(pts, true)
      return
    case 'sand':
      g.fillStyle(C.sand, 1).fillPoints(pts, true)
      g.fillStyle(C.sandDark, 1)
      for (let i = 0; i < 4; i++) g.fillCircle(cx + (hash(x + i, y + 3) - 0.5) * 36, cy + (hash(x + 3, y + i) - 0.5) * 14, 1.2)
      return
    case 'bridge':
      g.fillStyle(C.bridge, 1).fillPoints(diamond(cx, cy, 2), true)
      g.lineStyle(2, C.bridgeDark, 1)
      for (let i = -2; i <= 2; i++) {
        g.beginPath()
        g.moveTo(cx - 14 + i * 8, cy - 7 + 2 + i * 4)
        g.lineTo(cx + 2 + i * 8, cy + 1 + 2 + i * 4)
        g.strokePath()
      }
      g.lineStyle(3, INK, 0.8)
      g.beginPath()
      g.moveTo(cx - 32, cy + 2)
      g.lineTo(cx, cy - 14)
      g.strokePath()
      return
    default: {
      // grass and flowers
      g.fillStyle(C.grass[Math.floor(r * 3)], 1).fillPoints(pts, true)
      g.lineStyle(2, C.grassBlade, 0.9)
      for (let i = 0; i < 3; i++) {
        const bx = cx + (hash(x + i * 3, y) - 0.5) * 36
        const by = cy + (hash(x, y + i * 3) - 0.5) * 14
        g.beginPath()
        g.moveTo(bx - 3, by + 2)
        g.lineTo(bx - 1, by - 3)
        g.moveTo(bx + 1, by + 2)
        g.lineTo(bx + 3, by - 4)
        g.strokePath()
      }
      if (r > 0.82) g.fillStyle(C.grassLight, 0.6).fillEllipse(cx + 6, cy - 2, 18, 6)
      if (tile === 'flowers')
        for (let i = 0; i < 5; i++) {
          g.fillStyle(C.flowers[i % 3], 1)
          g.fillCircle(cx + (hash(x + i, y + 9) - 0.5) * 38, cy + (hash(x + 9, y + i) - 0.5) * 14, 2.6)
        }
    }
  }
}

/** Outlined blob: every circle filled in ink slightly larger first, so the outline is one clean shape. */
function blob(g: Phaser.GameObjects.Graphics, circles: [number, number, number, number][]) {
  for (const [x, y, rr] of circles) g.fillStyle(INK, 1).fillCircle(x, y, rr + 3)
  for (const [x, y, rr, col] of circles) g.fillStyle(col, 1).fillCircle(x, y, rr)
}

/** Generates prop textures once per game. Origins are set where the sprites are created. */
export function makePropTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({}, false)
  const tex = (key: string, w: number, h: number, draw: () => void) => {
    g.clear()
    draw()
    g.generateTexture(key, w, h)
  }

  tex('tree', 84, 108, () => {
    g.fillStyle(0x000000, 0.18).fillEllipse(42, 100, 54, 14)
    g.fillStyle(INK, 1).fillRoundedRect(34, 62, 16, 40, 5)
    g.fillStyle(0x8a5a3b, 1).fillRoundedRect(37, 64, 10, 36, 4)
    blob(g, [
      [42, 48, 28, 0x4f8a2f],
      [26, 56, 18, 0x5e9c35],
      [58, 56, 18, 0x5e9c35],
      [42, 34, 22, 0x6fae4a],
      [34, 28, 10, 0x8bc34a],
    ])
    g.fillStyle(0xa6d672, 0.8).fillCircle(32, 26, 5)
  })
  tex('bush', 60, 46, () => {
    g.fillStyle(0x000000, 0.16).fillEllipse(30, 40, 46, 10)
    blob(g, [
      [20, 28, 13, 0x5e9c35],
      [40, 28, 13, 0x5e9c35],
      [30, 20, 14, 0x6fae4a],
    ])
    g.fillStyle(0xe2574c, 1).fillCircle(22, 22, 3).fillCircle(38, 26, 3).fillCircle(31, 14, 3)
  })
  tex('rock', 56, 44, () => {
    g.fillStyle(0x000000, 0.16).fillEllipse(28, 38, 46, 10)
    const outer = [8, 36, 6, 20, 18, 8, 36, 6, 50, 18, 50, 34, 30, 40].reduce<Phaser.Math.Vector2[]>((a, v, i, arr) => (i % 2 ? a : [...a, new Phaser.Math.Vector2(v, arr[i + 1])]), [])
    g.fillStyle(INK, 1).fillPoints(outer.map((p) => new Phaser.Math.Vector2(p.x + (p.x > 28 ? 2 : -2), p.y + (p.y > 22 ? 2 : -2))), true)
    g.fillStyle(0x9aa0a6, 1).fillPoints(outer, true)
    g.fillStyle(0xc3c8cc, 1).fillTriangle(18, 10, 36, 8, 24, 22)
  })
  tex('fence', 64, 48, () => {
    g.lineStyle(7, INK, 1)
    g.beginPath().moveTo(6, 22).lineTo(58, 48 - 22).strokePath()
    g.beginPath().moveTo(6, 32).lineTo(58, 48 - 12).strokePath()
    g.lineStyle(4, 0xb98252, 1)
    g.beginPath().moveTo(6, 22).lineTo(58, 26).strokePath()
    g.beginPath().moveTo(6, 32).lineTo(58, 36).strokePath()
    for (const px of [10, 54]) {
      g.fillStyle(INK, 1).fillRoundedRect(px - 5, 12, 10, 34, 3)
      g.fillStyle(0x8a5a3b, 1).fillRoundedRect(px - 3, 14, 6, 30, 2)
    }
  })
  tex('well', 64, 80, () => {
    g.fillStyle(0x000000, 0.18).fillEllipse(32, 72, 56, 14)
    g.fillStyle(INK, 1).fillRoundedRect(8, 44, 48, 30, 10)
    g.fillStyle(0xa3a8ae, 1).fillRoundedRect(11, 46, 42, 26, 9)
    g.fillStyle(INK, 1).fillEllipse(32, 46, 48, 16)
    g.fillStyle(0x5ab4d8, 1).fillEllipse(32, 46, 40, 11)
    g.fillStyle(INK, 1).fillRect(12, 14, 6, 34).fillRect(46, 14, 6, 34)
    g.fillStyle(INK, 1).fillTriangle(2, 20, 32, 2, 62, 20)
    g.fillStyle(0xd9534f, 1).fillTriangle(7, 18, 32, 5, 57, 18)
  })
  tex('house', 140, 168, () => {
    const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
    g.fillStyle(0x000000, 0.18).fillEllipse(70, 160, 130, 26)
    // walls (footprint diamond bottom at 70,164; wall height 56)
    g.fillStyle(INK, 1).fillPoints([V(3, 132), V(70, 166), V(137, 132), V(137, 74), V(70, 40), V(3, 74)], true)
    g.fillStyle(0xfff6e3, 1).fillPoints([V(6, 131), V(70, 162), V(70, 107), V(6, 76)], true)
    g.fillStyle(0xecd9b8, 1).fillPoints([V(70, 162), V(134, 131), V(134, 76), V(70, 107)], true)
    // door and windows
    g.fillStyle(INK, 1).fillPoints([V(92, 152), V(112, 142), V(112, 112), V(92, 122)], true)
    g.fillStyle(0x8a5a3b, 1).fillPoints([V(95, 149), V(109, 142), V(109, 115), V(95, 122)], true)
    g.fillStyle(INK, 1).fillPoints([V(24, 118), V(46, 129), V(46, 109), V(24, 98)], true)
    g.fillStyle(0x9ed8f0, 1).fillPoints([V(27, 116), V(43, 124), V(43, 111), V(27, 102)], true)
    // roof (pyramid with eaves)
    g.fillStyle(INK, 1).fillPoints([V(-2, 80), V(70, 116), V(142, 80), V(70, 2)], true)
    g.fillStyle(0xd9534f, 1).fillPoints([V(3, 79), V(70, 112), V(70, 8)], true)
    g.fillStyle(0xb03e3a, 1).fillPoints([V(70, 112), V(137, 79), V(70, 8)], true)
    g.lineStyle(2, 0xf28b82, 0.8).beginPath().moveTo(36, 56).lineTo(60, 26).strokePath()
  })
  tex('shadow', 44, 14, () => {
    g.fillStyle(0x000000, 0.22).fillEllipse(22, 7, 40, 12)
  })
  g.destroy()
}
