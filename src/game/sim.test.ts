import { describe, expect, it } from 'vitest'
import { HARVEST, parseMap } from './map'
import { GREENHAVEN } from './maps/greenhaven'
import { RESPAWN_MS, WorldSim } from './sim'

const map = parseMap(GREENHAVEN)
const seeded = (seed = 7) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const run = (sim: WorldSim, seconds: number, input = { x: 0, y: 0 }, start = 0, paused = false) => {
  let now = start
  for (let i = 0; i < seconds * 60; i++) sim.update(1 / 60, input, (now += 1000 / 60), paused)
  return now
}

describe('WorldSim', () => {
  it('starts on the spawn tile', () => {
    const sim = new WorldSim(map, seeded())
    expect(sim.hero.pos).toEqual({ x: map.spawn.x + 0.5, y: map.spawn.y + 0.5 })
  })

  it('arriving by boat starts on the arrival tile', () => {
    const sim = new WorldSim(map, seeded(), { atArrival: true })
    expect(sim.hero.pos).toEqual({ x: map.arrival.x + 0.5, y: map.arrival.y + 0.5 })
  })

  it('returns to the academy door', () => {
    const sim = new WorldSim(map, seeded(), { atArrival: true, start: { x: 10, y: 28 } })
    expect(sim.hero.pos).toEqual({ x: 10.5, y: 28.5 })
  })

  it('spawns as many monsters as the map asks for', () => {
    const sim = new WorldSim(map, seeded())
    const total = Object.values(map.monsterCounts).reduce((a, b) => a + (b ?? 0), 0)
    expect(sim.monsters.length).toBe(total)
  })

  it('stick up moves the hero toward grid (-1,-1) at full speed', () => {
    const sim = new WorldSim(map, seeded())
    const start = { ...sim.hero.pos }
    run(sim, 0.5, { x: 0, y: -1 })
    const dx = start.x - sim.hero.pos.x
    const dy = start.y - sim.hero.pos.y
    expect(dx).toBeGreaterThan(0.3)
    expect(dx).toBeCloseTo(dy, 5)
    expect(sim.hero.speed01).toBeCloseTo(1, 2)
  })

  it('paused ignores input and stands still', () => {
    const sim = new WorldSim(map, seeded())
    const start = { ...sim.hero.pos }
    run(sim, 0.5, { x: 0, y: -1 }, 0, true)
    expect(sim.hero.pos).toEqual(start)
    expect(sim.hero.speed01).toBe(0)
  })

  it('standing by Elder Rowan gives the npc prompt', () => {
    const sim = new WorldSim(map, seeded())
    sim.hero.pos = { x: 12.5, y: 30.5 }
    expect(sim.prompt()).toEqual({ kind: 'npc', id: 'elder' })
  })

  it('a tap on a tree walks to a free tile beside it', () => {
    const sim = new WorldSim(map, seeded())
    sim.hero.pos = { x: 12.5, y: 30.5 }
    sim.tap({ x: 11.4, y: 28.6 }) // tree at tile (11, 28)
    expect(sim.path.length).toBeGreaterThan(0)
    const end = sim.path[sim.path.length - 1]
    expect(map.blocked(end.x, end.y)).toBe(false)
    expect(Math.max(Math.abs(end.x - 11), Math.abs(end.y - 28))).toBe(1)
  })

  it('a defeated monster disappears and respawns in its zone after 20 s', () => {
    const sim = new WorldSim(map, seeded())
    const m = sim.monsters[0]
    sim.defeat(m.id, 1000)
    expect(m.alive).toBe(false)
    run(sim, 0.1, undefined, 1000 + RESPAWN_MS - 200)
    expect(m.alive).toBe(false)
    run(sim, 0.1, undefined, 1000 + RESPAWN_MS + 1)
    expect(m.alive).toBe(true)
    expect(map.monsterZones[m.kind]!.some((t) => t.x === Math.floor(m.pos.x) && t.y === Math.floor(m.pos.y))).toBe(true)
  })

  it("adds up to three Returning monsters of the map's own kinds", () => {
    const kinds = Object.keys(map.monsterCounts)
    const sim = new WorldSim(map, seeded(), { returning: 2 })
    const back = sim.monsters.filter((m) => m.returning)
    expect(back).toHaveLength(2)
    for (const m of back) expect(kinds).toContain(m.kind)
    expect(new WorldSim(map, seeded(), { returning: 9 }).monsters.filter((m) => m.returning)).toHaveLength(3)
    expect(new WorldSim(map, seeded(), { returning: 0 }).monsters.filter((m) => m.returning)).toHaveLength(0)
  })

  it('a beaten Returning monster stays gone while a normal one respawns', () => {
    const sim = new WorldSim(map, seeded(), { returning: 1 })
    const back = sim.monsters.find((m) => m.returning)!
    const normal = sim.monsters.find((m) => !m.returning)!
    sim.defeat(back.id, 1000)
    sim.defeat(normal.id, 1000)
    run(sim, 0.1, undefined, 1000 + RESPAWN_MS + 1)
    expect(normal.alive).toBe(true)
    expect(back.alive).toBe(false)
  })

  it('more Returning monsters can arrive later, but never more than three in a visit', () => {
    const sim = new WorldSim(map, seeded())
    sim.addReturning(1)
    sim.addReturning(1)
    expect(sim.monsters.filter((m) => m.returning)).toHaveLength(1)
    sim.defeat('returning-0', 0)
    sim.addReturning(5)
    expect(sim.monsters.filter((m) => m.returning)).toHaveLength(3)
  })

  it('the prompt says when a monster is Returning', () => {
    const sim = new WorldSim(map, seeded(), { returning: 1 })
    sim.monsters = sim.monsters.filter((m) => m.returning)
    sim.hero.pos = { ...sim.monsters[0].pos }
    expect(sim.prompt()).toMatchObject({ kind: 'monster', returning: true })
  })

  it('monsters stay inside their zone and hop between tiles', () => {
    const sim = new WorldSim(map, seeded())
    let hopped = false
    let now = 0
    for (let i = 0; i < 600; i++) {
      sim.update(1 / 20, { x: 0, y: 0 }, (now += 50), false)
      hopped ||= sim.monsters.some((m) => m.hopT >= 0)
      for (const m of sim.monsters) expect(map.monsterZones[m.kind]!.some((t) => t.x === Math.floor(m.pos.x) && t.y === Math.floor(m.pos.y)), m.id).toBe(true)
    }
    expect(hopped).toBe(true)
  })
})

describe('harvesting and the camp', () => {
  const node = map.props.find((p) => p.kind === 'harvest_tree')!
  const free = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: x + dx, y: y + dy })).find((p) => !map.blocked(p.x, p.y))!

  it('standing by a ready harvest tree offers to harvest it', () => {
    const sim = new WorldSim(map, seeded())
    const at = free(node.x, node.y)
    sim.monsters = []
    sim.hero.pos = { x: at.x + 0.5, y: at.y + 0.5 }
    expect(sim.prompt()).toMatchObject({ kind: 'harvest', x: node.x, y: node.y, material: 'wood' })
  })

  it('a regrowing node is never offered', () => {
    const sim = new WorldSim(map, seeded())
    const at = free(node.x, node.y)
    sim.monsters = []
    sim.hero.pos = { x: at.x + 0.5, y: at.y + 0.5 }
    sim.regrowing = new Set([`${node.x},${node.y}`])
    expect(sim.prompt()).not.toMatchObject({ kind: 'harvest', x: node.x, y: node.y })
  })

  it('a regrowing node never hides a ready one next to it', () => {
    const nodes = map.props.filter((p) => p.kind in HARVEST)
    const d = (n: { x: number; y: number }, x: number, y: number) => Math.hypot(n.x - x, n.y - y)
    // A free tile with two nodes in reach.
    let spot: { x: number; y: number; near: typeof nodes } | undefined
    for (let y = 0; y < map.height && !spot; y++)
      for (let x = 0; x < map.width && !spot; x++) {
        const near = nodes.filter((n) => d(n, x, y) <= 1.5).sort((a, b) => d(a, x, y) - d(b, x, y))
        if (!map.blocked(x, y) && near.length >= 2 && d(near[0], x, y) < d(near[1], x, y)) spot = { x, y, near }
      }
    const sim = new WorldSim(map, seeded())
    sim.monsters = []
    sim.hero.pos = { x: spot!.x + 0.5, y: spot!.y + 0.5 }
    sim.regrowing = new Set([`${spot!.near[0].x},${spot!.near[0].y}`])
    expect(sim.prompt()).toMatchObject({ kind: 'harvest', x: spot!.near[1].x, y: spot!.near[1].y })
  })

  it('the workbench opens crafting', () => {
    const bench = map.props.find((p) => p.kind === 'workbench')!
    const sim = new WorldSim(map, seeded())
    const at = free(bench.x, bench.y)
    sim.monsters = []
    sim.hero.pos = { x: at.x + 0.5, y: at.y + 0.5 }
    expect(sim.prompt()).toEqual({ kind: 'workbench' })
  })

  it('standing by the whiteboard opens the camp board (the panel says if the stand is not built yet)', () => {
    const board = map.props.find((p) => p.kind === 'whiteboard')!
    const sim = new WorldSim(map, seeded())
    sim.monsters = []
    sim.hero.pos = { x: board.x + 0.5, y: board.y + 0.5 }
    expect(sim.prompt()).toEqual({ kind: 'board' })
  })

  it('items placed on an island block walking at once', () => {
    const sim = new WorldSim(map, seeded())
    const free = map.cells.flatMap((row, y) => row.map((c, x) => ({ c, x, y }))).find(({ c, x, y }) => !c.blocks && !map.blocked(x, y))!
    expect(sim.blocked(free.x, free.y)).toBe(false)
    sim.extraBlocked = new Set([`${free.x},${free.y}`])
    expect(sim.blocked(free.x, free.y)).toBe(true)
    sim.hero.pos = { x: free.x - 1 + 0.5, y: free.y + 0.5 }
    sim.tap({ x: free.x + 0.5, y: free.y + 0.5 })
    expect(sim.path.some((p) => Math.floor(p.x) === free.x && Math.floor(p.y) === free.y)).toBe(false)
  })
})

