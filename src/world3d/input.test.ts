import { afterEach, describe, expect, it } from 'vitest'
import { listenKeys } from './input'

describe('camera keys', () => {
  let keys: ReturnType<typeof listenKeys>
  afterEach(() => keys.stop())
  it('Z/X turn and R/F tilt, without moving the hero; E still interacts', () => {
    let interacted = 0
    keys = listenKeys(() => interacted++)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }))
    expect(interacted).toBe(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }))
    expect(keys.readCamera()).toEqual({ yaw: 1, tilt: 1 })
    expect(keys.read()).toEqual({ x: 0, y: 0 })
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyX' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ' }))
    expect(keys.readCamera().yaw).toBe(-1)
  })
})
