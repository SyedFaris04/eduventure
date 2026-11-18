import { Vector2, type Material } from 'three'

/**
 * Where the hero is, for the see-through circle: scenery closer to the camera than the hero is cut away (dithered,
 * softer toward the edge) inside a small circle around the hero on screen, so trees and roofs never hide them.
 * The world updates these every frame; every patched material shares them.
 */
export const seeThrough = {
  hero: { value: new Vector2(-10, -10) }, // screen position, 0..1
  depth: { value: 0 }, // hero's distance from the camera along its view
  radius: { value: 0 }, // in screen heights; 0 turns the circle off
  aspect: { value: 1 },
  resolution: { value: new Vector2(1, 1) }, // drawing-buffer pixels
}

/** Circle size in screen heights: about the hero's height on screen, which shrinks as the camera backs away. */
export function seeThroughRadius(depth: number, fovDeg: number): number {
  const heroOnScreen = 1.4 / (2 * Math.max(depth, 1) * Math.tan(((fovDeg / 2) * Math.PI) / 180))
  return Math.min(0.45, 0.8 * heroOnScreen)
}

const patched = new WeakSet<Material>()

/** Adds the see-through circle to a scenery material (after any patch it already has, such as the wind). */
export function addSeeThrough<T extends Material>(m: T): T {
  if (patched.has(m)) return m
  patched.add(m)
  const before = m.onBeforeCompile
  const key = m.customProgramCacheKey.bind(m)
  m.onBeforeCompile = (shader, renderer) => {
    before.call(m, shader, renderer)
    Object.assign(shader.uniforms, {
      uSeeHero: seeThrough.hero,
      uSeeDepth: seeThrough.depth,
      uSeeRadius: seeThrough.radius,
      uSeeAspect: seeThrough.aspect,
      uSeeRes: seeThrough.resolution,
    })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vSeeDepth;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vSeeDepth = -mvPosition.z;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vSeeDepth;\nuniform vec2 uSeeHero;\nuniform float uSeeDepth;\nuniform float uSeeRadius;\nuniform float uSeeAspect;\nuniform vec2 uSeeRes;')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
  if (uSeeRadius > 0.0 && vSeeDepth < uSeeDepth - 0.6) {
    vec2 seeD = (gl_FragCoord.xy / uSeeRes - uSeeHero) * vec2(uSeeAspect, 1.0);
    float seeR = length(seeD) / uSeeRadius;
    float seeN = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
    // Clear in the middle, a dithered fade over the outer third.
    if (seeR < 0.65 || (seeR < 1.0 && seeN > (seeR - 0.65) / 0.35)) discard;
  }`,
      )
  }
  m.customProgramCacheKey = () => `${key()}|see`
  return m
}
