import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CAMERA, loadCamera, PHONE_CAMERA, useCamera } from './cameraStore'
import { SHORT_QUERY } from '../app/useShortScreen'

describe('camera settings', () => {
  beforeEach(() => {
    localStorage.clear()
    useCamera.getState().reset()
  })

  it('starts on Balanced and saves changes on this device', () => {
    expect(loadCamera()).toEqual(DEFAULT_CAMERA)
    useCamera.getState().set({ tilt: 30, fov: 40 })
    expect(loadCamera()).toMatchObject({ tilt: 30, fov: 40 })
  })

  it('keeps every value in range', () => {
    useCamera.getState().set({ tilt: 5, distance: 99, fov: 200 })
    expect(useCamera.getState()).toMatchObject({ tilt: 25, distance: 32, fov: 50 })
  })

  it('a preset sets tilt and zoom; rotation wraps; reset goes back to Balanced', () => {
    useCamera.getState().preset('overhead')
    expect(useCamera.getState()).toMatchObject({ tilt: 65, distance: 27 })
    useCamera.getState().rotate(-45)
    expect(useCamera.getState().yaw).toBe(315)
    useCamera.getState().rotate(90)
    expect(useCamera.getState().yaw).toBe(45)
    useCamera.getState().orbit(10, -100)
    expect(useCamera.getState()).toMatchObject({ yaw: 55, tilt: 25 }) // tilt stays in range
    useCamera.getState().reset()
    expect(loadCamera()).toEqual(DEFAULT_CAMERA)
  })

  it('ignores broken saved data', () => {
    localStorage.setItem('eduventure.camera', '{not json')
    expect(loadCamera()).toEqual(DEFAULT_CAMERA)
  })

  describe('on a phone held sideways', () => {
    beforeEach(() => {
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === SHORT_QUERY, addEventListener() {}, removeEventListener() {} }))
      localStorage.clear() // the outer reset saved the desktop default before this stub
    })
    afterEach(() => vi.unstubAllGlobals())

    it('starts closer, so heroes and monsters are big enough on a small screen; reset goes back there', () => {
      expect(loadCamera()).toEqual(PHONE_CAMERA)
      expect(PHONE_CAMERA.distance).toBeLessThan(DEFAULT_CAMERA.distance)
      useCamera.getState().set({ distance: 20 })
      useCamera.getState().reset()
      expect(loadCamera()).toEqual(PHONE_CAMERA)
    })

    it("keeps the player's own saved camera", () => {
      localStorage.setItem('eduventure.camera', JSON.stringify({ tilt: 50, distance: 20, fov: 30, yaw: 0 }))
      expect(loadCamera()).toMatchObject({ tilt: 50, distance: 20 })
    })
  })

  it('a camera saved with the old quarter turns keeps its heading', () => {
    localStorage.setItem('eduventure.camera', JSON.stringify({ tilt: 40, distance: 18, fov: 30, turn: 3 }))
    expect(loadCamera().yaw).toBe(270)
  })
})
