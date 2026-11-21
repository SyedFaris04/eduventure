import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPhone, lockLandscape, needsRotate } from './orientation'

// screenShort: the device screen's short side (a tablet in split screen has a narrow window but a big screen).
const phoneUpright = { width: 390, height: 844, screenShort: 390, coarse: true }

describe('landscape only on phones', () => {
  it('asks a phone held upright to turn sideways in the game', () => {
    expect(needsRotate(phoneUpright, '/world')).toBe(true)
    expect(needsRotate({ width: 360, height: 740, screenShort: 360, coarse: true }, '/home')).toBe(true)
  })

  it('never blocks pages opened from a message or used outside play: parents, teachers, admin, sign-in, password', () => {
    for (const path of ['/parent', '/teacher', '/admin', '/login', '/signup', '/reset-password', '/update-password'])
      expect(needsRotate(phoneUpright, path), path).toBe(false)
  })

  it('only phones get the landscape lock on Tap to start, never tablets', () => {
    expect(isPhone({ screenShort: 390, coarse: true })).toBe(true)
    expect(isPhone({ screenShort: 768, coarse: true })).toBe(false)
    expect(isPhone({ screenShort: 500, coarse: false })).toBe(false)
  })

  it('leaves sideways phones, tablets (also in split screen) and desktop browsers alone', () => {
    expect(needsRotate({ width: 844, height: 390, screenShort: 390, coarse: true }, '/world')).toBe(false)
    expect(needsRotate({ width: 768, height: 1024, screenShort: 768, coarse: true }, '/world')).toBe(false)
    expect(needsRotate({ width: 400, height: 1000, screenShort: 1024, coarse: true }, '/world')).toBe(false)
    expect(needsRotate({ ...phoneUpright, coarse: false }, '/world')).toBe(false)
  })
})

describe('lockLandscape', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('never throws when the browser refuses or lacks full screen and the orientation lock', async () => {
    const reject = () => Promise.reject(new Error('NotSupportedError'))
    vi.stubGlobal('screen', { orientation: { lock: reject } })
    document.documentElement.requestFullscreen = reject as never
    await expect(lockLandscape()).resolves.toBe(false)
    vi.stubGlobal('screen', {})
    document.documentElement.requestFullscreen = undefined as never
    await expect(lockLandscape()).resolves.toBe(false)
  })

  it('reports success when the lock is granted', async () => {
    vi.stubGlobal('screen', { orientation: { lock: () => Promise.resolve() } })
    document.documentElement.requestFullscreen = (() => Promise.resolve()) as never
    await expect(lockLandscape()).resolves.toBe(true)
  })
})
