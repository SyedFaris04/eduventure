export type Point = { x: number; y: number }

/** Diamond tile size in pixels (2:1 isometric). */
export const TILE_W = 64
export const TILE_H = 32

/** Grid (tile) coordinates → screen pixels of the tile's centre. */
export function gridToScreen(p: Point): Point {
  return { x: (p.x - p.y) * (TILE_W / 2), y: (p.x + p.y) * (TILE_H / 2) }
}

/** Screen pixels → grid coordinates (fractional). */
export function screenToGrid(p: Point): Point {
  return { x: p.y / TILE_H + p.x / TILE_W, y: p.y / TILE_H - p.x / TILE_W }
}
