import { describe, expect, it } from 'vitest'
import { isBuildTap } from './buildTap'

describe('a build tap', () => {
  it('is one finger (or click) that lifts close to where it went down', () => {
    expect(isBuildTap({ x: 100, y: 100, multi: false }, { x: 104, y: 97 })).toBe(true)
  })
  it('is not a drag, and not part of a two-finger pinch or twist', () => {
    expect(isBuildTap({ x: 100, y: 100, multi: false }, { x: 140, y: 100 })).toBe(false)
    expect(isBuildTap({ x: 100, y: 100, multi: true }, { x: 100, y: 100 })).toBe(false)
    expect(isBuildTap(null, { x: 100, y: 100 })).toBe(false)
  })
})
