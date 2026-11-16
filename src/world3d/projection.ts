import type { Point } from '../game/iso'

/** Tile (x, y) sits at world (x, 0, y); one tile is one world unit. */
export const gridToWorld = (p: Point): [number, 0, number] => [p.x, 0, p.y]
export const worldToGrid = (x: number, z: number): Point => ({ x, y: z })

/** Clash-style fixed camera: looks down the grid diagonal so screen-up is grid (−1, −1), as `screenDirToGrid` assumes. */
export const CAMERA = { elevationDeg: 52, distance: 22, minDistance: 13, maxDistance: 32, fov: 30 } as const

/** Camera position relative to the point it looks at. */
export function cameraOffset(distance: number): [number, number, number] {
  const e = (CAMERA.elevationDeg * Math.PI) / 180
  const flat = Math.cos(e) * distance
  return [flat * Math.SQRT1_2, Math.sin(e) * distance, flat * Math.SQRT1_2]
}
