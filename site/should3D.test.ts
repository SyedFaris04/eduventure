import { describe, expect, it } from 'vitest'
import { should3D } from './should3D'

describe('when the website draws 3D', () => {
  it('needs WebGL and no request for reduced motion', () => {
    expect(should3D({ webgl: true, reducedMotion: false })).toBe(true)
    expect(should3D({ webgl: false, reducedMotion: false })).toBe(false)
    expect(should3D({ webgl: true, reducedMotion: true })).toBe(false)
  })
})
