import { create } from 'zustand'

export type AudioSettings = { muted: boolean; music: number; effects: number }
const KEY = 'eduventure.audio'
const LEGACY = 'eduventure.sound' // the old on/off switch from the loading screen and Home
const clamp = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d)

/** Saved on this device. Sound starts muted (browsers allow audio only after a tap) at gentle volumes. */
export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return { muted: Boolean(s.muted), music: clamp(s.music, 0.35), effects: clamp(s.effects, 0.7) }
    }
    return { muted: localStorage.getItem(LEGACY) !== 'on', music: 0.35, effects: 0.7 }
  } catch {
    return { muted: true, music: 0.35, effects: 0.7 }
  }
}

function save(s: AudioSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    localStorage.setItem(LEGACY, s.muted ? 'off' : 'on')
  } catch {
    // Private mode: the setting lasts this visit.
  }
}

export const useAudioSettings = create<AudioSettings & { set: (s: Partial<AudioSettings>) => void }>((set, get) => ({
  ...loadAudioSettings(),
  set: (s) => {
    const next = { muted: s.muted ?? get().muted, music: clamp(s.music ?? get().music, 0.35), effects: clamp(s.effects ?? get().effects, 0.7) }
    save(next)
    set(next)
  },
}))
