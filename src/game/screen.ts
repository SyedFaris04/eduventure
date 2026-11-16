import type { Point } from './iso'

/** Where a grid point appears on screen (CSS pixels), set by the 3D world while it is open; null otherwise. */
export const screenOf: { current: ((p: Point) => Point) | null } = { current: null }
