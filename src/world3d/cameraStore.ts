import { SHORT_QUERY } from '../app/useShortScreen'
import { create } from 'zustand'
import { CAMERA, PRESETS, type PresetId } from './projection'

/** `yaw` turns the camera around the hero, in degrees (0–359, 0 = the original diagonal view). */
export type CameraSettings = { tilt: number; distance: number; fov: number; yaw: number }
export const DEFAULT_CAMERA: CameraSettings = { ...PRESETS.balanced, fov: CAMERA.fov, yaw: 0 }
/** Phones held sideways start closer, so heroes and monsters are big enough to read on a small screen. */
export const PHONE_CAMERA: CameraSettings = { tilt: 40, distance: 11, fov: CAMERA.fov, yaw: 0 }
const startCamera = () => (typeof window !== 'undefined' && window.matchMedia?.(SHORT_QUERY).matches ? PHONE_CAMERA : DEFAULT_CAMERA)
const KEY = 'eduventure.camera'
const LIMITS = { tilt: [25, 70], distance: [CAMERA.minDistance, CAMERA.maxDistance], fov: [25, 50] } as const
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v))

function tidy(c: Partial<CameraSettings> & { turn?: number }): CameraSettings {
  const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  return {
    tilt: clamp(n(c.tilt, DEFAULT_CAMERA.tilt), LIMITS.tilt),
    distance: clamp(n(c.distance, DEFAULT_CAMERA.distance), LIMITS.distance),
    fov: clamp(n(c.fov, DEFAULT_CAMERA.fov), LIMITS.fov),
    // Older saves stored quarter turns.
    yaw: (((Math.round(n(c.yaw, n(c.turn, 0) * 90)) % 360) + 360) % 360),
  }
}

/** The camera this device last used (a phone and a PC can differ). Broken or blocked storage gives the default. */
export function loadCamera(): CameraSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? tidy(JSON.parse(raw)) : startCamera()
  } catch {
    return startCamera()
  }
}
function save(c: CameraSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    // Private mode or blocked storage: the setting lasts this visit.
  }
}

let saveSoon: ReturnType<typeof setTimeout> | undefined

type Store = CameraSettings & {
  set: (c: Partial<CameraSettings>) => void
  preset: (id: PresetId) => void
  rotate: (degrees: number) => void
  orbit: (dYaw: number, dTilt: number) => void
  reset: () => void
}

/** The player's camera: tilt, zoom, field of view and a heading all the way around, saved on this device. */
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
    rotate: (degrees) => update({ yaw: get().yaw + degrees }),
    // Dragging and held keys move the camera every frame: change it at once, save a moment later.
    orbit: (dYaw, dTilt) => {
      const next = tidy({ ...get(), yaw: get().yaw + dYaw, tilt: get().tilt + dTilt })
      set(next)
      clearTimeout(saveSoon)
      saveSoon = setTimeout(() => save(next), 400)
    },
    reset: () => update(startCamera()),
  }
})
