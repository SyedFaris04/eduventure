import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MOODS, type Mood } from './theory'
import { SFX_NAMES } from './sfx'
import { recordedSfx } from './engine'

const DIR = 'public/assets/audio'
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) as string[]
const credits = readFileSync(`${DIR}/CREDITS.md`, 'utf8')

describe('recorded audio files', () => {
  it('every listed file exists, is a known music mood or effect, and is credited', () => {
    for (const f of manifest) {
      expect(existsSync(`${DIR}/${f}`), f).toBe(true)
      const m = /^(music|sfx)-([a-z]+)\.mp3$/.exec(f)
      expect(m, f).not.toBeNull()
      if (m![1] === 'music') expect(Object.keys(MOODS), f).toContain(m![2])
      else expect(SFX_NAMES as string[], f).toContain(m![2])
      expect(credits, `${f} is missing from CREDITS.md`).toContain(f)
    }
  })

  it('every mood has a recorded track, and only CC0 sources are credited', () => {
    for (const mood of Object.keys(MOODS) as Mood[]) expect(manifest).toContain(`music-${mood}.mp3`)
    expect(credits).not.toMatch(/CC[- ]BY/i)
  })

  it('picks the effects that have a recorded file; the rest keep their code sound', () => {
    expect(recordedSfx(['music-study.mp3', 'sfx-tap.mp3', 'sfx-nope.mp3', 'sfx-coin.mp3'])).toEqual(['tap', 'coin'])
    expect(recordedSfx([])).toEqual([])
  })
})
