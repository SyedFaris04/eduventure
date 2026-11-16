import { describe, expect, it } from 'vitest'
import { Mesh } from 'three'
import { buildMonster, MONSTER_KINDS } from './buildMonster'
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
