import { playSfx } from '../../audio/engine'
import { useAudioSettings } from '../../audio/settings'

// The loading screen and Home switch all sound on or off; volumes live in ⚙️ Settings (src/audio).
export const getSoundEnabled = () => !useAudioSettings.getState().muted
export const setSoundEnabled = (on: boolean) => useAudioSettings.getState().set({ muted: !on })

const MAP = { tap: 'tap', pop: 'hop', done: 'sparkle' } as const

/** The loading screen's little reactions (kept for its callers; the game uses playSfx directly). */
export const playChime = (kind: keyof typeof MAP) => playSfx(MAP[kind])
