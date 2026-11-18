import { describe, expect, it } from 'vitest'
import { CAMERA, cameraOffset, DEFAULT_YAW, gridToWorld, lookHeight, PRESETS, worldToGrid } from './projection'
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

  it('tilt and rotation belong to the player', () => {
    const [x, y, z] = cameraOffset(20, 35, 0)
    expect((Math.atan2(y, Math.hypot(x, z)) * 180) / Math.PI).toBeCloseTo(35, 4)
    expect(x).toBeCloseTo(0, 6) // yaw 0: the camera sits on +z
    expect(z).toBeGreaterThan(0)
    const turned = cameraOffset(20, 35, DEFAULT_YAW + Math.PI / 2)
    const up = screenDirToGrid({ x: 0, y: -1 }, DEFAULT_YAW + Math.PI / 2)
    const len = Math.hypot(turned[0], turned[2])
    expect(up.x).toBeCloseTo(-turned[0] / len, 4) // screen-up still walks away from the camera
    expect(up.y).toBeCloseTo(-turned[2] / len, 4)
  })

  it('a lower camera aims higher on the hero', () => {
    expect(lookHeight(70)).toBeLessThan(lookHeight(52))
    expect(lookHeight(52)).toBeLessThan(lookHeight(25))
    expect(lookHeight(25)).toBeCloseTo(0.9, 2)
    expect(lookHeight(70)).toBeCloseTo(0.1, 2)
  })

  it('presets: Balanced is the new default, Classic is the old view', () => {
    expect(PRESETS.balanced).toEqual({ tilt: 38, distance: 15 })
    expect(PRESETS.classic).toEqual({ tilt: CAMERA.elevationDeg, distance: CAMERA.distance })
    expect(PRESETS.close.tilt).toBeLessThan(PRESETS.balanced.tilt)
    expect(PRESETS.overhead.tilt).toBeGreaterThan(PRESETS.classic.tilt)
  })
})
