import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CAMERA, loadCamera, useCamera } from './cameraStore'

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
    useCamera.getState().rotate(-1)
    expect(useCamera.getState().turn).toBe(3)
    useCamera.getState().rotate(1)
    expect(useCamera.getState().turn).toBe(0)
    useCamera.getState().reset()
    expect(loadCamera()).toEqual(DEFAULT_CAMERA)
  })

  it('ignores broken saved data', () => {
    localStorage.setItem('eduventure.camera', '{not json')
    expect(loadCamera()).toEqual(DEFAULT_CAMERA)
  })
})
