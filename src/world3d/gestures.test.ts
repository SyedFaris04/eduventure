import { describe, expect, it } from 'vitest'
import { twoFinger } from './gestures'

describe('two-finger camera gestures', () => {
  it('pinching apart zooms in, together zooms out', () => {
    expect(twoFinger({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: -50, y: 0 }, { x: 150, y: 0 }).scale).toBeCloseTo(0.5) // fingers twice as far: half the distance
  })
  it('twisting turns the camera', () => {
    const g = twoFinger({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 100 })
    expect(Math.abs(g.yawDeg)).toBeCloseTo(90)
  })
  it('sliding both fingers up tilts the camera', () => {
    const g = twoFinger({ x: 0, y: 100 }, { x: 100, y: 100 }, { x: 0, y: 60 }, { x: 100, y: 60 })
    expect(g.panY).toBeCloseTo(-40)
    expect(g.yawDeg).toBeCloseTo(0)
    expect(g.scale).toBeCloseTo(1)
  })
})
