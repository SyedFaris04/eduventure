import { describe, expect, it } from 'vitest'
import { faceToward, glide } from './glide'

describe('other players glide between updates', () => {
  it('moves at most speed × dt toward the target', () => {
    const p = glide({ x: 0, y: 0 }, { x: 5, y: 0 }, 0.5, 3.2)
    expect(p.x).toBeCloseTo(1.6)
    expect(p.y).toBe(0)
  })

  it('snaps when almost there', () => {
    expect(glide({ x: 1, y: 1 }, { x: 1.005, y: 1 }, 0.016)).toEqual({ x: 1.005, y: 1 })
  })

  it('jumps straight to a far target (a teleport, a new island, a reconnect)', () => {
    expect(glide({ x: 0, y: 0 }, { x: 40, y: 3 }, 0.016)).toEqual({ x: 40, y: 3 })
  })

  it('faces the way it moves, and keeps facing when standing still', () => {
    expect(faceToward({ x: 0, y: 0 }, { x: 0, y: 1 }, 2)).toBeCloseTo(0)
    expect(faceToward({ x: 0, y: 0 }, { x: 1, y: 0 }, 2)).toBeCloseTo(Math.PI / 2)
    expect(faceToward({ x: 3, y: 3 }, { x: 3, y: 3 }, 2)).toBe(2)
  })
})
