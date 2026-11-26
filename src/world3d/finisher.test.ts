import { describe, expect, it } from 'vitest'
import { FINISHER, facingToward, finisherCamera } from './finisher'

const view = { tilt: 40, distance: 11 }
const hero = { x: 0, y: 0 }
const foe = { x: 0, y: 1 } // straight ahead along +z
/** How much the camera looks along the hero→monster line (1 = from behind or in front, 0 = side-on). */
const along = (yaw: number) => Math.abs(Math.cos(yaw)) // (sin yaw, cos yaw)·(0, 1)
const shot = (t: number, yaw = Math.PI / 4) => finisherCamera(t, view, yaw, hero, foe)

describe('the defeat cutscene', () => {
  it('runs in order: the attack, the impact, the banner, the cheer, the end', () => {
    expect(FINISHER.attackAt).toBeLessThan(FINISHER.impactAt)
    expect(FINISHER.impactAt).toBeLessThan(FINISHER.bannerAt)
    expect(FINISHER.bannerAt).toBeLessThan(FINISHER.cheerAt)
    expect(FINISHER.cheerAt).toBeLessThan(FINISHER.duration)
    expect(FINISHER.duration).toBeLessThanOrEqual(3000) // dramatic, but short enough to keep the game moving
  })

  it('the camera swoops from the player’s view to a low close-up, then holds', () => {
    expect(shot(0)).toMatchObject({ blend: 0, distance: 11, tilt: 40, yaw: Math.PI / 4 })
    const held = shot(FINISHER.impactAt)
    expect(held.blend).toBe(1)
    expect(held.distance).toBeLessThan(8)
    expect(held.tilt).toBeLessThan(30)
    expect(shot(FINISHER.duration).yaw).not.toBeCloseTo(held.yaw) // a slow orbit
  })

  it('turns side-on, so the hero never hides the monster', () => {
    expect(along(shot(FINISHER.impactAt).yaw)).toBeLessThan(0.5)
    expect(along(shot(FINISHER.duration).yaw)).toBeLessThan(0.5)
  })

  it('swings the short way round, to whichever side the player was already nearer', () => {
    const fromLeft = shot(FINISHER.impactAt, -Math.PI / 3).yaw
    const fromRight = shot(FINISHER.impactAt, Math.PI / 3).yaw
    expect(Math.sin(fromLeft)).toBeLessThan(0)
    expect(Math.sin(fromRight)).toBeGreaterThan(0)
  })

  it('shakes only for a moment after the impact', () => {
    expect(shot(FINISHER.impactAt - 10).shake).toBe(0)
    expect(shot(FINISHER.impactAt + 20).shake).toBeGreaterThan(0.5)
    expect(shot(FINISHER.impactAt + 400).shake).toBe(0)
  })

  it('the hero turns to face the monster (grid x → world x, grid y → world z)', () => {
    expect(facingToward({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(0)
    expect(facingToward({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(Math.PI / 2)
  })
})
