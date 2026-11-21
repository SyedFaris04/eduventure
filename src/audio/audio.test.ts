import { beforeEach, describe, expect, it } from 'vitest'
import { barNotes, midiToHz, MOODS, type Mood } from './theory'
import { SFX, SFX_NAMES } from './sfx'
import { loadAudioSettings, useAudioSettings } from './settings'

const seeded = (seed = 7) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

describe('music theory', () => {
  it('A4 is 440 Hz', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6)
    expect(midiToHz(81)).toBeCloseTo(880, 6)
  })

  it('every mood plays only notes from its own scale, inside the bar', () => {
    for (const mood of Object.keys(MOODS) as Mood[]) {
      const m = MOODS[mood]
      const inScale = (midi: number) => m.scale.includes((((midi - m.root) % 12) + 12) % 12)
      for (let bar = 0; bar < 8; bar++) {
        const notes = barNotes(mood, bar, seeded(bar + 1))
        expect(notes.length, mood).toBeGreaterThan(2)
        for (const n of notes) {
          expect(inScale(n.midi), `${mood} bar ${bar} midi ${n.midi}`).toBe(true)
          expect(n.at).toBeGreaterThanOrEqual(0)
          expect(n.at).toBeLessThan(4)
          expect(n.dur).toBeGreaterThan(0)
        }
      }
    }
  })

  it('is gentle: slow tempo, melody in a comfortable range', () => {
    for (const mood of Object.keys(MOODS) as Mood[]) {
      expect(MOODS[mood].bpm).toBeLessThanOrEqual(84)
      const lead = [0, 1, 2, 3].flatMap((b) => barNotes(mood, b, seeded(3))).filter((n) => n.voice === 'lead')
      for (const n of lead) {
        expect(n.midi).toBeGreaterThanOrEqual(60)
        expect(n.midi).toBeLessThanOrEqual(88)
      }
    }
  })

  it('the same seed gives the same bar', () => {
    expect(barNotes('kampung', 2, seeded(5))).toEqual(barNotes('kampung', 2, seeded(5)))
  })
})

describe('sound effects', () => {
  it('every effect is short and quiet', () => {
    for (const name of SFX_NAMES) {
      const parts = SFX[name]
      expect(parts.length, name).toBeGreaterThan(0)
      for (const p of parts) {
        expect(p.at + p.dur, name).toBeLessThanOrEqual(1.6)
        expect(p.gain, name).toBeLessThanOrEqual(0.3)
      }
    }
  })

  it('a wrong answer sounds soft, never harsh', () => {
    for (const p of SFX.wrong) expect(['sawtooth', 'square']).not.toContain(p.type as string)
  })
})

describe('audio settings', () => {
  beforeEach(() => {
    localStorage.clear()
    useAudioSettings.getState().set({ muted: true, music: 0.35, effects: 0.7 })
  })

  it('defaults to muted until the player turns sound on, with gentle volumes', () => {
    localStorage.clear()
    expect(loadAudioSettings()).toEqual({ muted: true, music: 0.35, effects: 0.7 })
  })

  it('keeps the old sound switch and saves volumes in range', () => {
    localStorage.clear()
    localStorage.setItem('eduventure.sound', 'on')
    expect(loadAudioSettings().muted).toBe(false)
    useAudioSettings.getState().set({ music: 2, effects: -1 })
    expect(useAudioSettings.getState()).toMatchObject({ music: 1, effects: 0 })
    expect(loadAudioSettings()).toMatchObject({ music: 1, effects: 0 })
  })
})

describe('which music plays where', () => {
  it('islands have their own mood; lessons and battles play softer', async () => {
    const { musicFor } = await import('./director')
    expect(musicFor('/world', 'kampung', false)).toEqual({ mood: 'kampung', level: 1 })
    expect(musicFor('/world', 'tech', true)).toEqual({ mood: 'tech', level: 0.5 })
    expect(musicFor('/hall/english-basics/en-u1-l1', 'kingdom', false)).toEqual({ mood: 'study', level: 0.5 })
    expect(musicFor('/academy', 'kampung', false)).toEqual({ mood: 'study', level: 1 })
    expect(musicFor('/home', 'alpine', false)).toEqual({ mood: 'study', level: 1 })
  })

  it('My island has its own cozy music', async () => {
    const { musicFor, PLACE_THEME } = await import('./director')
    expect(musicFor('/world', PLACE_THEME.my_island, false)).toEqual({ mood: 'cozy', level: 1 })
  })
})
