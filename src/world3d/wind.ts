import type { Material } from 'three'

/** One clock for every swaying material, advanced by the scene each frame. */
export const windTime = { value: 0 }
/** 0 or 1: High graphics sends waves of stronger wind rolling across the island (decision #54). */
export const windGust = { value: 0 }

/**
 * Makes an instanced material sway in the wind: vertices bend more the higher they sit in the model, and each
 * instance starts at its own phase so a forest never moves in lockstep. Cheap: a few lines in the vertex shader.
 */
export function addWind<T extends Material>(m: T, strength: number): T {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTime
    shader.uniforms.uWindGust = windGust
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;\nuniform float uWindGust;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
  float windPhase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.45;
  vec2 windAt = (modelMatrix * instanceMatrix[3]).xz;
#else
  float windPhase = 0.0;
  vec2 windAt = modelMatrix[3].xz;
#endif
  float windGustK = 1.0 + uWindGust * (0.8 + 0.8 * sin(uWindTime * 0.9 - (windAt.x + windAt.y) * 0.18));
  float windBend = max(0.0, position.y) * ${strength.toFixed(4)} * windGustK;
  transformed.x += sin(uWindTime * 1.7 + windPhase) * windBend;
  transformed.z += cos(uWindTime * 1.3 + windPhase) * windBend * 0.6;`,
      )
  }
  m.customProgramCacheKey = () => `wind-${strength}`
  return m
}
