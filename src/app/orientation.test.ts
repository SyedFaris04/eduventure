import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPhone, lockLandscape, needsRotate } from './orientation'

describe('landscape only on phones', () => {
  it('asks a phone held upright to turn sideways', () => {
    expect(needsRotate({ width: 390, height: 844, coarse: true })).toBe(true)
    expect(needsRotate({ width: 360, height: 740, coarse: true })).toBe(true)
  })

  it('only phones get the landscape lock on Tap to start, never tablets', () => {
    expect(isPhone({ width: 844, height: 390, coarse: true })).toBe(true)
    expect(isPhone({ width: 1024, height: 768, coarse: true })).toBe(false)
    expect(isPhone({ width: 1366, height: 500, coarse: false })).toBe(false)
  })

  it('leaves sideways phones, tablets and desktop browsers alone', () => {
    expect(needsRotate({ width: 844, height: 390, coarse: true })).toBe(false)
    expect(needsRotate({ width: 768, height: 1024, coarse: true })).toBe(false)
    expect(needsRotate({ width: 390, height: 844, coarse: false })).toBe(false)
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
