// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readGlbJson } from '../glb'
import { CLIP, pickLoop } from './animation'

describe('hero animation', () => {
  it('picks idle, walk or run from speed', () => {
    expect(pickLoop(0)).toBe('idle')
    expect(pickLoop(0.3)).toBe('walk')
    expect(pickLoop(0.6)).toBe('run')
    expect(pickLoop(1)).toBe('run')
  })

  it('every action maps to a clip in the rig', () => {
    const rig = readGlbJson(new Uint8Array(readFileSync(new URL('../../../public/assets/models/rig.glb', import.meta.url))))
    const names = rig.animations!.map((a) => a.name)
    for (const clip of Object.values(CLIP)) expect(names).toContain(clip)
  })
})
