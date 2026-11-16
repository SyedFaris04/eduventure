import { describe, expect, it } from 'vitest'
import { parseMap } from './map'
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
    sim.hero.pos = { x: 12.5, y: 14.5 }
    expect(sim.prompt()).toEqual({ kind: 'npc', id: 'elder' })
  })

  it('a tap on a tree walks to a free tile beside it', () => {
    const sim = new WorldSim(map, seeded())
    sim.hero.pos = { x: 12.5, y: 14.5 }
    sim.tap({ x: 11.4, y: 12.6 }) // tree at tile (11, 12)
    expect(sim.path.length).toBeGreaterThan(0)
    const end = sim.path[sim.path.length - 1]
    expect(map.blocked(end.x, end.y)).toBe(false)
    expect(Math.max(Math.abs(end.x - 11), Math.abs(end.y - 12))).toBe(1)
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
    expect(map.monsterZones[m.kind].some((t) => t.x === Math.floor(m.pos.x) && t.y === Math.floor(m.pos.y))).toBe(true)
  })

  it('monsters stay inside their zone and hop between tiles', () => {
    const sim = new WorldSim(map, seeded())
    let hopped = false
    let now = 0
    for (let i = 0; i < 600; i++) {
      sim.update(1 / 20, { x: 0, y: 0 }, (now += 50), false)
      hopped ||= sim.monsters.some((m) => m.hopT >= 0)
      for (const m of sim.monsters) expect(map.monsterZones[m.kind].some((t) => t.x === Math.floor(m.pos.x) && t.y === Math.floor(m.pos.y)), m.id).toBe(true)
    }
    expect(hopped).toBe(true)
  })
})
