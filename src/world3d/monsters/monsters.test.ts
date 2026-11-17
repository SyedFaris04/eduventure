import { describe, expect, it } from 'vitest'
import { Box3, Mesh, Vector3 } from 'three'
import { snapshotKey } from '../snapshotKey'
import { BOSS_IDS, buildMonster, MONSTER_KINDS } from './buildMonster'
import { monsterMotion, type MotionState } from './motion'

const STATES: MotionState[] = ['idle', 'hop', 'hit', 'poof']
const samples = (state: MotionState, seed = 0.3) => Array.from({ length: 21 }, (_, i) => monsterMotion(state, i / 20, seed))

describe('monsterMotion', () => {
  it('a hop leaves and lands on the ground and peaks half-way', () => {
    const s = samples('hop')
    expect(s[0].y).toBe(0)
    expect(s[20].y).toBeCloseTo(0, 5)
    expect(s[10].y).toBe(Math.max(...s.map((m) => m.y)))
    expect(s[10].y).toBeGreaterThan(0.15)
  })

  it('squash and stretch roughly keep the volume', () => {
    for (const state of STATES)
      for (const m of samples(state)) {
        const v = m.sx * m.sy * m.sz
        expect(v, `${state}`).toBeGreaterThan(0.85)
        expect(v, `${state}`).toBeLessThan(1.15)
      }
  })

  it('a poof fades out completely', () => {
    expect(monsterMotion('poof', 1, 0).opacity).toBe(0)
    expect(monsterMotion('poof', 0, 0).opacity).toBe(1)
  })
})

describe('buildMonster', () => {
  it('builds every monster and the guardian from several meshes', () => {
    for (const kind of [...MONSTER_KINDS, 'guardian'] as const) {
      let meshes = 0
      buildMonster(kind).traverse((o) => o instanceof Mesh && meshes++)
      expect(meshes, kind).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('island monsters and bosses', () => {
  const size = (k: Parameters<typeof buildMonster>[0]) => {
    const g = buildMonster(k)
    g.updateMatrixWorld(true)
    const b = new Box3().setFromObject(g)
    return { h: b.getSize(new Vector3()).y, feet: b.min.y }
  }

  it('has all nine monsters and three bosses', () => {
    expect([...MONSTER_KINDS].sort()).toEqual(['alphabat', 'bugsy', 'bytebot', 'commaleon', 'cubelet', 'dinobud', 'hexowl', 'hornbill', 'loopy', 'pangolin', 'pebblewing', 'pisnake', 'sproutling', 'tapir', 'wordworm'])
    expect([...BOSS_IDS].sort()).toEqual(['abacus_titan', 'glitch_golem', 'guardian', 'lexicon_dragon', 'raja_rafflesia'])
  })

  it('monsters stand on the ground at monster size', () => {
    for (const k of MONSTER_KINDS) {
      const { h, feet } = size(k)
      expect(Math.abs(feet), `${k} feet`).toBeLessThanOrEqual(0.08)
      expect(h, `${k} height`).toBeGreaterThanOrEqual(0.6)
      expect(h, `${k} height`).toBeLessThanOrEqual(1.4)
    }
  })

  it('bosses stand on the ground at boss size', () => {
    for (const k of BOSS_IDS) {
      const { h, feet } = size(k)
      expect(Math.abs(feet), `${k} feet`).toBeLessThanOrEqual(0.08)
      expect(h, `${k} height`).toBeGreaterThanOrEqual(1.8)
      expect(h, `${k} height`).toBeLessThanOrEqual(3.2)
    }
  })

  it('each boss has its own picture key', () => {
    const keys = BOSS_IDS.map((boss) => snapshotKey({ kind: 'boss', boss }))
    expect(new Set(keys).size).toBe(5)
    expect(keys).toContain('boss:raja_rafflesia')
  })
})
