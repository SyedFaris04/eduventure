import { describe, expect, it, vi } from 'vitest'
import { Bone, Group, Mesh, PropertyBinding } from 'three'
import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, PART_ORDER, shopValues, type Appearance } from '../../features/character/appearance'
import { BONES, heroParts } from './parts'
import { buildHero } from './buildHero'
import { material } from './materials'

function fakeRig(skip?: string) {
  const rig = new Group()
  for (const name of BONES) {
    if (name === skip) continue
    const b = new Bone()
    b.name = PropertyBinding.sanitizeNodeName(name) // as GLTFLoader names them
    b.position.set(0, 0.1, 0)
    rig.add(b)
  }
  return rig
}
const key = (a: Appearance) => JSON.stringify(heroParts(a))

describe('heroParts', () => {
  it("every free option changes the hero's parts", () => {
    for (const part of PART_ORDER) {
      const seen = new Map<string, string>()
      for (const value of APPEARANCE_OPTIONS[part]) {
        const k = key({ ...DEFAULT_APPEARANCE, [part]: value } as Appearance)
        expect(seen.get(k), `${part}=${value} looks the same as ${part}=${seen.get(k)}`).toBeUndefined()
        seen.set(k, value)
      }
    }
  })

  it('every shop item draws differently from free options and other items in its slot', () => {
    for (const part of PART_ORDER) {
      const values = [...APPEARANCE_OPTIONS[part], ...shopValues(part)]
      const keys = values.map((v) => key({ ...DEFAULT_APPEARANCE, [part]: v } as Appearance))
      expect(new Set(keys).size, part).toBe(values.length)
    }
  })

  it('skin colour reaches head, hands and arms', () => {
    const parts = heroParts({ ...DEFAULT_APPEARANCE, skin: '#5a3521' }).filter((p) => p.colour === '#5a3521')
    const bones = new Set(parts.map((p) => p.bone))
    for (const b of ['head', 'hand.l', 'hand.r', 'lowerarm.l', 'lowerarm.r']) expect(bones).toContain(b)
  })

  it('hostile appearance is sanitised', () => {
    expect(heroParts({ ...DEFAULT_APPEARANCE, top: '<script>' } as never)).toEqual(heroParts(DEFAULT_APPEARANCE))
  })
})

describe('buildHero', () => {
  it('puts each part on its bone', () => {
    const rig = fakeRig()
    buildHero(DEFAULT_APPEARANCE, rig)
    for (const spec of heroParts(DEFAULT_APPEARANCE)) {
      const bone = rig.getObjectByName(PropertyBinding.sanitizeNodeName(spec.bone))!
      expect(bone.children.some((c) => c instanceof Mesh && c.userData.slot === spec.slot), `${spec.slot} on ${spec.bone}`).toBe(true)
    }
  })

  it('a missing bone throws a clear error', () => {
    expect(() => buildHero(DEFAULT_APPEARANCE, fakeRig('head'))).toThrow('rig is missing bone head')
  })

  it('shares geometry and materials between builds and keeps them on dispose', () => {
    const a = buildHero(DEFAULT_APPEARANCE, fakeRig())
    const b = buildHero(DEFAULT_APPEARANCE, fakeRig())
    const meshes = (h: typeof a) => {
      const out: Mesh[] = []
      h.group.traverse((o) => o instanceof Mesh && out.push(o))
      return out
    }
    const ma = meshes(a).filter((m) => m.userData.shared)
    const mb = meshes(b).filter((m) => m.userData.shared)
    expect(ma.length).toBeGreaterThan(20)
    ma.forEach((m, i) => {
      expect(m.material).toBe(mb[i].material)
      expect(m.geometry).toBe(mb[i].geometry)
    })
    const mat = material('#6fae4a')
    const spy = vi.spyOn(mat, 'dispose')
    const g = vi.spyOn(ma[0].geometry, 'dispose')
    a.dispose()
    expect(spy).not.toHaveBeenCalled()
    expect(g).not.toHaveBeenCalled()
    expect(meshes(a)).toHaveLength(0) // parts are taken off the bones
  })
})
