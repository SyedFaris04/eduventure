import { beforeEach, describe, expect, it } from 'vitest'
import { canSkip, markSailed, rideMs, rideOver } from './ride'

describe('boat ride', () => {
  beforeEach(() => localStorage.clear())

  it('ride waits for load', () => {
    expect(rideOver(0, 9000, 7000, false)).toBe(false) // long enough, but the island hasn't loaded
    expect(rideOver(0, 6999, 7000, true)).toBe(false) // loaded, but the ride isn't over
    expect(rideOver(0, 7000, 7000, true)).toBe(true)
  })

  it('the swift perahu is faster, and reduced motion is a short fade', () => {
    expect(rideMs(6, false)).toBe(7000)
    expect(rideMs(7, false)).toBe(4000)
    expect(rideMs(10, true)).toBe(1200)
  })

  it('Skip appears after the first ride', () => {
    expect(canSkip()).toBe(false)
    markSailed()
    expect(canSkip()).toBe(true)
  })
})
