// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readGlbJson } from './glb'

const dir = new URL('../../public/assets/models/', import.meta.url)
const load = (name: string) => readGlbJson(new Uint8Array(readFileSync(new URL(name, dir))))

const RIG_CLIPS = ['Idle', 'Walking_A', 'Running_A', 'Cheer', 'Hit_A', 'Interact', '1H_Melee_Attack_Chop', 'Jump_Full_Short']
const JOINTS = ['hips', 'chest', 'head', 'upperarm.l', 'upperarm.r', 'lowerarm.l', 'lowerarm.r', 'hand.l', 'hand.r', 'handslot.l', 'handslot.r', 'upperleg.l', 'upperleg.r', 'lowerleg.l', 'lowerleg.r', 'foot.l', 'foot.r']
const PROPS = ['tree_a', 'tree_b', 'rock_a', 'rock_b', 'rock_c', 'house_a', 'house_b', 'well', 'fence']

describe('3D models', () => {
  it('rig has the eight clips and no meshes', () => {
    const rig = load('rig.glb')
    expect(rig.animations!.map((a) => a.name).sort()).toEqual([...RIG_CLIPS].sort())
    expect(rig.meshes ?? []).toHaveLength(0)
    const names = rig.nodes.map((n) => n.name)
    for (const j of JOINTS) expect(names).toContain(j)
  })

  it('every prop model exists and has a mesh', () => {
    for (const p of PROPS) {
      expect(existsSync(new URL(`${p}.glb`, dir)), p).toBe(true)
      expect(load(`${p}.glb`).meshes!.length, p).toBeGreaterThan(0)
    }
  })

  it('model budget', () => {
    const total = readdirSync(dir)
      .filter((f) => f.endsWith('.glb'))
      .reduce((s, f) => s + statSync(new URL(f, dir)).size, 0)
    expect(total).toBeLessThanOrEqual(6 * 1024 * 1024)
  })
})
