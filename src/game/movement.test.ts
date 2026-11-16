import { describe, expect, it } from 'vitest'
import { findPath, screenDirToGrid, step, RADIUS } from './movement'

// Small test world: '#' blocks.
function world(rows: string[]) {
  return (x: number, y: number) => {
    const cx = Math.floor(x)
    const cy = Math.floor(y)
    return cy < 0 || cx < 0 || cy >= rows.length || cx >= rows[0].length || rows[cy][cx] === '#'
  }
}

describe('step', () => {
  const open = world(['.....', '.....', '.....', '.....', '.....'])

  it('moves at the configured speed on open ground', () => {
    const p = step({ x: 1.5, y: 1.5 }, { x: 1, y: 0 }, 0.25, open)
    expect(p.x).toBeCloseTo(1.5 + 3.2 * 0.25)
    expect(p.y).toBeCloseTo(1.5)
  })

  it('stops at a blocked tile instead of entering it', () => {
    const wall = world(['.....', '.....', '...#.', '.....', '.....'])
    let p = { x: 2.5, y: 2.5 }
    for (let i = 0; i < 60; i++) p = step(p, { x: 1, y: 0 }, 1 / 60, wall)
    expect(p.x).toBeLessThanOrEqual(3 - RADIUS + 1e-9)
  })

  it('slides along a wall when moving diagonally', () => {
    const wall = world(['.....', '.....', '...#.', '...#.', '...#.'])
    let p = { x: 2.5, y: 2.5 }
    for (let i = 0; i < 30; i++) p = step(p, { x: Math.SQRT1_2, y: Math.SQRT1_2 }, 1 / 60, wall)
    expect(p.x).toBeLessThanOrEqual(3 - RADIUS + 1e-9)
    expect(p.y).toBeGreaterThan(2.5)
  })

  it('never squeezes diagonally between two blocked corner tiles', () => {
    const corner = world(['.....', '.....', '...#.', '..#..', '.....'])
    let p = { x: 2.5, y: 2.5 }
    for (let i = 0; i < 120; i++) p = step(p, { x: Math.SQRT1_2, y: Math.SQRT1_2 }, 1 / 60, corner)
    expect(Math.floor(p.x) === 3 && Math.floor(p.y) === 3).toBe(false)
    expect(corner(p.x, p.y)).toBe(false)
  })
})

describe('screenDirToGrid', () => {
  it('turns screen-up into the north-west grid diagonal', () => {
    const d = screenDirToGrid({ x: 0, y: -1 })
    expect(d.x).toBeCloseTo(-Math.SQRT1_2)
    expect(d.y).toBeCloseTo(-Math.SQRT1_2)
  })
  it('returns zero for no input', () => {
    expect(screenDirToGrid({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })
})

describe('findPath', () => {
  const pond = world(['......', '.####.', '.####.', '......'])

  it('walks around obstacles to reach the goal', () => {
    const path = findPath({ x: 0, y: 0 }, { x: 3, y: 3 }, pond)!
    expect(path.at(-1)).toEqual({ x: 3, y: 3 })
    expect(path.every((p) => !pond(p.x, p.y))).toBe(true)
  })

  it('does not cut corners past blocked tiles', () => {
    const path = findPath({ x: 0, y: 0 }, { x: 5, y: 3 }, pond)!
    for (let i = 1; i <= path.length; i++) {
      const a = i === 1 ? { x: 0, y: 0 } : path[i - 2]
      const b = path[i - 1]
      if (a.x !== b.x && a.y !== b.y) expect(pond(b.x, a.y) || pond(a.x, b.y)).toBe(false)
    }
  })

  it('returns null when the goal cannot be reached', () => {
    const walled = world(['..#..', '..#..', '..#..'])
    expect(findPath({ x: 0, y: 0 }, { x: 4, y: 0 }, walled)).toBeNull()
  })
})
