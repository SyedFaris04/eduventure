import { create } from 'zustand'
import { CAMERA, PRESETS, type PresetId } from './projection'

export type CameraSettings = { tilt: number; distance: number; fov: number; turn: number }
export const DEFAULT_CAMERA: CameraSettings = { ...PRESETS.balanced, fov: CAMERA.fov, turn: 0 }
const KEY = 'eduventure.camera'
const LIMITS = { tilt: [25, 70], distance: [CAMERA.minDistance, CAMERA.maxDistance], fov: [25, 50] } as const
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v))

function tidy(c: Partial<CameraSettings>): CameraSettings {
  const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  return {
    tilt: clamp(n(c.tilt, DEFAULT_CAMERA.tilt), LIMITS.tilt),
    distance: clamp(n(c.distance, DEFAULT_CAMERA.distance), LIMITS.distance),
    fov: clamp(n(c.fov, DEFAULT_CAMERA.fov), LIMITS.fov),
    turn: ((Math.round(n(c.turn, 0)) % 4) + 4) % 4,
  }
}

/** The camera this device last used (a phone and a PC can differ). Broken or blocked storage gives the default. */
export function loadCamera(): CameraSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? tidy(JSON.parse(raw)) : DEFAULT_CAMERA
  } catch {
    return DEFAULT_CAMERA
  }
}
function save(c: CameraSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    // Private mode or blocked storage: the setting lasts this visit.
  }
}

type Store = CameraSettings & {
  set: (c: Partial<CameraSettings>) => void
  preset: (id: PresetId) => void
  rotate: (by: 1 | -1) => void
  reset: () => void
}

/** The player's camera: tilt, zoom, field of view and a quarter-turn heading, all saved on this device. */
export const useCamera = create<Store>((set, get) => {
  const update = (c: Partial<CameraSettings>) => {
    const next = tidy({ ...get(), ...c })
    save(next)
    set(next)
  }
  return {
    ...loadCamera(),
    set: update,
    preset: (id) => update(PRESETS[id]),
    rotate: (by) => update({ turn: get().turn + by }),
    reset: () => update(DEFAULT_CAMERA),
  }
})
