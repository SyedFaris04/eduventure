import { describe, expect, it } from 'vitest'
import { CAMERA, cameraOffset, gridToWorld, worldToGrid } from './projection'
import { screenDirToGrid } from '../game/movement'

describe('projection', () => {
  it('grid and world round-trip', () => {
    const [x, , z] = gridToWorld({ x: 3.5, y: 7.25 })
    expect(worldToGrid(x, z)).toEqual({ x: 3.5, y: 7.25 })
  })

  it('camera screen-up is grid (-1,-1), matching the joystick mapping', () => {
    const [x, , z] = cameraOffset(CAMERA.distance)
    const len = Math.hypot(x, z)
    expect(-x / len).toBeCloseTo(-Math.SQRT1_2, 4)
    expect(-z / len).toBeCloseTo(-Math.SQRT1_2, 4)
    const up = screenDirToGrid({ x: 0, y: -1 })
    expect(up.x).toBeCloseTo(-Math.SQRT1_2, 4)
    expect(up.y).toBeCloseTo(-Math.SQRT1_2, 4)
  })

  it('elevation and distance', () => {
    const [x, y, z] = cameraOffset(18)
    expect((Math.atan2(y, Math.hypot(x, z)) * 180) / Math.PI).toBeCloseTo(CAMERA.elevationDeg, 4)
    expect(Math.hypot(x, y, z)).toBeCloseTo(18, 4)
  })
})
