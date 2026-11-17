import { describe, expect, it } from 'vitest'
import { Box3, Mesh, Vector3 } from 'three'
import type { Theme, TileKind } from '../game/map'
import { buildCodeProp, CODE_PROP_KINDS, type CodePropKind } from './props/codeProps'
import { THEMES, tileColour } from './themes'

const THEME_IDS: Theme[] = ['kampung', 'rainforest', 'alpine', 'tech', 'kingdom']
const TILES: TileKind[] = ['grass', 'flowers', 'path', 'sand', 'water', 'bridge', 'jetty', 'snow', 'stone', 'mud', 'circuit', 'metal', 'cobble']
const HEX = /^#[0-9a-f]{6}$/i

describe('themes', () => {
  it('every theme has a sky, fog and water colour, and a colour for every tile', () => {
    for (const id of THEME_IDS) {
      const th = THEMES[id]
      expect(th.sky).toMatch(HEX)
      expect(th.water).toMatch(HEX)
      expect(th.fog[0]).toBeLessThan(th.fog[1])
      for (const tile of TILES) expect(tileColour(id, tile), `${id} ${tile}`).toMatch(HEX)
    }
  })
  it('themes look different from each other', () => {
    expect(new Set(THEME_IDS.map((t) => THEMES[t].sky)).size).toBe(5)
    expect(tileColour('rainforest', 'grass')).not.toBe(tileColour('kampung', 'grass'))
  })
})

const WIDE: Partial<Record<CodePropKind, number>> = { kampung_house: 2.2, abacus_gate: 2.7, academy: 3.2, language_hall: 3.2 }

describe('code-built props', () => {
  it('covers every new prop kind', () => {
    expect([...CODE_PROP_KINDS].sort()).toEqual(['abacus_gate', 'academy', 'fern', 'holo_tree', 'kampung_house', 'language_hall', 'letter_block', 'library_tower', 'mangrove', 'mushroom', 'neon_lamp', 'palm', 'pillar', 'pine_snow', 'robot_statue', 'scroll_tree', 'server_tower', 'signpost', 'stall', 'sundial'])
  })

  for (const kind of CODE_PROP_KINDS)
    it(`${kind} has meshes, fits its footprint and stands on the ground`, () => {
      const o = buildCodeProp(kind)
      let meshes = 0
      o.traverse((c) => c instanceof Mesh && meshes++)
      expect(meshes).toBeGreaterThan(0)
      o.updateMatrixWorld(true)
      const size = new Box3().setFromObject(o).getSize(new Vector3())
      const box = new Box3().setFromObject(o)
      const wide = WIDE[kind] ?? 1.6
      expect(size.x, `${kind} width`).toBeLessThanOrEqual(wide)
      expect(size.z, `${kind} depth`).toBeLessThanOrEqual(Math.max(wide, 1.6))
      expect(size.y, `${kind} height`).toBeLessThanOrEqual(3.5)
      expect(Math.abs(box.min.y), `${kind} feet`).toBeLessThanOrEqual(0.05)
    })

  it('shares geometry between copies to save memory', () => {
    const geoms = (k: CodePropKind) => {
      const g: unknown[] = []
      buildCodeProp(k).traverse((c) => c instanceof Mesh && g.push(c.geometry))
      return g
    }
    expect(geoms('palm')).toEqual(geoms('palm'))
  })
})

describe('water regions', () => {
  // Loads the whole 3D water module, which takes several seconds on a busy machine.
  it('splits the pond from the sea cove by the jetty', { timeout: 60_000 }, async () => {
    const { parseMap } = await import('../game/map')
    const { GREENHAVEN } = await import('../game/maps/greenhaven')
    const { waterRegions } = await import('./Water')
    const r = waterRegions(parseMap(GREENHAVEN))
    expect(r.filter((x) => !x.sea)).toHaveLength(1) // the village pond
    expect(r.filter((x) => x.sea).length).toBeGreaterThanOrEqual(1) // the cove either side of the jetty
    const pond = r.find((x) => !x.sea)!
    expect(pond.w).toBeLessThanOrEqual(8) // not one box stretched across the whole island
  })
})
