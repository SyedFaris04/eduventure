import { describe, expect, it } from 'vitest'
import { MeshStandardMaterial, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three'
import { addWind, windGust, windTime } from './wind'

describe('wind', () => {
  it('sways with the shared clock, and gusts roll across when High graphics turns them on', () => {
    const m = addWind(new MeshStandardMaterial(), 0.1)
    const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '' } as unknown as WebGLProgramParametersWithUniforms
    m.onBeforeCompile(shader, {} as WebGLRenderer)
    expect(shader.uniforms).toMatchObject({ uWindTime: windTime, uWindGust: windGust }) // shared objects: one write moves every plant
    expect(shader.vertexShader).toContain('uWindGust')
    expect(windGust.value).toBe(0) // off unless High graphics sets it
  })
})
