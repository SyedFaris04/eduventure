import { describe, expect, it } from 'vitest'
import { MeshStandardMaterial, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three'
import { addWind } from './wind'
import { addSeeThrough, seeThroughRadius } from './seeThrough'

const fakeShader = () =>
  ({
    uniforms: {},
    vertexShader: '#include <common>\n#include <begin_vertex>\n#include <project_vertex>',
    fragmentShader: '#include <common>\n#include <clipping_planes_fragment>',
  }) as unknown as WebGLProgramParametersWithUniforms

describe('see-through circle', () => {
  it('cuts scenery in front of the hero, keeping the wind sway', () => {
    const m = addSeeThrough(addWind(new MeshStandardMaterial(), 0.05))
    const shader = fakeShader()
    m.onBeforeCompile(shader, {} as WebGLRenderer)
    expect(shader.vertexShader).toContain('uWindTime') // the earlier patch still runs
    expect(shader.vertexShader).toContain('vSeeDepth')
    expect(shader.fragmentShader).toContain('discard')
    expect(Object.keys(shader.uniforms)).toEqual(expect.arrayContaining(['uWindTime', 'uSeeHero', 'uSeeDepth', 'uSeeRadius', 'uSeeAspect', 'uSeeRes']))
    expect(m.customProgramCacheKey()).toContain('see')
  })

  it('patches a material only once', () => {
    const m = new MeshStandardMaterial()
    expect(addSeeThrough(addSeeThrough(m))).toBe(m)
    const shader = fakeShader()
    m.onBeforeCompile(shader, {} as WebGLRenderer)
    expect(shader.fragmentShader.split('discard').length).toBe(2)
  })

  it('the circle shrinks as the camera moves away', () => {
    expect(seeThroughRadius(10, 30)).toBeGreaterThan(seeThroughRadius(20, 30))
    expect(seeThroughRadius(15, 30)).toBeGreaterThan(0.05)
    expect(seeThroughRadius(15, 30)).toBeLessThan(0.5)
  })
})
