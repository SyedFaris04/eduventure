import type { Point } from '../game/iso'

/** Tile (x, y) sits at world (x, 0, y); one tile is one world unit. */
export const gridToWorld = (p: Point): [number, 0, number] => [p.x, 0, p.y]
export const worldToGrid = (x: number, z: number): Point => ({ x, y: z })

/** The original camera (now the Classic preset): looks down the grid diagonal from 52°. */
export const CAMERA = { elevationDeg: 52, distance: 22, minDistance: 9, maxDistance: 32, fov: 30 } as const
/** The camera's default heading: on the +x/+z diagonal, so screen-up is grid (−1, −1). */
export const DEFAULT_YAW = Math.PI / 4

/** Player presets (tilt in degrees, distance in tiles). Balanced is the default. */
export const PRESETS = {
  close: { tilt: 28, distance: 10 },
  balanced: { tilt: 38, distance: 15 },
  classic: { tilt: CAMERA.elevationDeg, distance: CAMERA.distance },
  overhead: { tilt: 65, distance: 27 },
} as const
export type PresetId = keyof typeof PRESETS

/** Camera position relative to the point it looks at: `tiltDeg` above the ground, heading `yaw` (0 = from +z). */
export function cameraOffset(distance: number, tiltDeg: number = CAMERA.elevationDeg, yaw: number = DEFAULT_YAW): [number, number, number] {
  const e = (tiltDeg * Math.PI) / 180
  const flat = Math.cos(e) * distance
  return [flat * Math.sin(yaw), Math.sin(e) * distance, flat * Math.cos(yaw)]
}

/** How high on the hero the camera aims: the chest when it is low (so faces read), the feet when it looks down. */
export const lookHeight = (tiltDeg: number) => Math.min(0.9, Math.max(0.1, 0.9 - ((tiltDeg - 25) * 0.8) / 45))
