import { describe, expect, it } from 'vitest'
import { Mesh, MeshStandardMaterial, type Group } from 'three'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { PET_SPECIES, type PetForm, type PetStage } from '../../features/pet/petRules'
import { snapshotKey } from '../snapshotKey'
import { buildPet, PET_SCALE } from './buildPet'
import { followStep } from './follow'
import { PetFollower } from './PetFollower'
import { CATALOGUE } from '../../features/shop/catalogue'

const meshes = (g: Group) => {
  const out: Mesh[] = []
  g.traverse((o) => o instanceof Mesh && out.push(o))
  return out
}
const colours = (g: Group) => new Set(meshes(g).map((m) => '#' + (m.material as MeshStandardMaterial).color?.getHexString()))
const STAGES: PetStage[] = ['baby', 'young', 'adult']
const FORMS: (PetForm | null)[] = [null, 'science', 'maths', 'technology', 'language', 'seimbang']

describe('buildPet', () => {
  it('every pet hat and neck item in the catalogue adds its own model', () => {
    const plain = meshes(buildPet(PET_SPECIES[0], 'young', null, {})).length
    for (const item of CATALOGUE.filter((i) => i.slot === 'pet_hat' || i.slot === 'pet_neck')) {
      const look = item.slot === 'pet_hat' ? { hat: item.id } : { neck: item.id }
      expect(meshes(buildPet(PET_SPECIES[0], 'young', null, look)).length, item.id).toBeGreaterThan(plain)
    }
  })

  it('builds every species, stage and form from a sensible number of meshes', () => {
    for (const sp of PET_SPECIES)
      for (const st of STAGES)
        for (const f of FORMS) {
          const n = meshes(buildPet(sp, st, f, {})).length
          expect(n, `${sp} ${st} ${f}`).toBeGreaterThan(4)
          expect(n, `${sp} ${st} ${f}`).toBeLessThan(60)
        }
  })
  it('gives each adult form its own colours', () => {
    const sets = (['science', 'maths', 'technology', 'language', 'seimbang'] as const).map((f) => [...colours(buildPet('naga', 'adult', f, {}))].sort().join())
    expect(new Set(sets).size).toBe(5)
  })
  it('older pets have more detail', () => {
    expect(meshes(buildPet('kancil', 'young', null, {})).length).toBeGreaterThan(meshes(buildPet('kancil', 'baby', null, {})).length)
    expect(PET_SCALE.baby).toBeLessThan(PET_SCALE.young)
    expect(PET_SCALE.young).toBeLessThan(PET_SCALE.adult)
  })
  it('wears a hat and a neck item, and a dye changes the body colour', () => {
    const plain = buildPet('beruang', 'baby', null, {})
    expect(meshes(buildPet('beruang', 'baby', null, { hat: 'pet_songkok' })).length).toBeGreaterThan(meshes(plain).length)
    expect(meshes(buildPet('beruang', 'baby', null, { neck: 'pet_bell' })).length).toBeGreaterThan(meshes(plain).length)
    expect([...colours(buildPet('beruang', 'baby', null, { dye: 'pet_dye_rose' }))].sort()).not.toEqual([...colours(plain)].sort())
  })
})

describe('pet pictures', () => {
  it('a new look is a new picture', () => {
    const base = { species: 'kancil', stage: 'baby', form: null, look: {} } as const
    const k = (pet: object) => snapshotKey({ kind: 'pet', pet: { ...base, ...pet } })
    expect(k({})).not.toBe(k({ look: { hat: 'pet_flower' } }))
    expect(k({ look: { neck: 'pet_bell' } })).not.toBe(k({ look: { dye: 'pet_bell' } }))
    expect(k({})).not.toBe(k({ stage: 'young' }))
  })
})

describe('following the hero', () => {
  it('followStep snaps after a jump', () => {
    const p = followStep({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, 1 / 60)
    expect(Math.hypot(p.x - 10, p.y)).toBeLessThan(1.2)
  })
  it('walks closer without standing on the hero', () => {
    const p = followStep({ x: 0, y: 0 }, { x: 1.5, y: 1.5 }, 0, 0.1)
    const before = Math.hypot(1.5, 1.5)
    const after = Math.hypot(p.x - 1.5, p.y - 1.5)
    expect(after).toBeLessThan(before)
    for (let i = 0; i < 300; i++) Object.assign(p, followStep(p, { x: 1.5, y: 1.5 }, 0, 1 / 30))
    expect(Math.hypot(p.x - 1.5, p.y - 1.5)).toBeGreaterThan(0.5)
  })
  it('PetFollower renders nothing without a pet', () => {
    expect(renderToString(createElement(PetFollower, { leader: {} as never, pet: null, reduced: false }))).toBe('')
  })
})
