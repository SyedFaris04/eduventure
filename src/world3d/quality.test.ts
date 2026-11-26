import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canRise, createQualityMonitor, loadQualityChoice, saveQualityChoice } from './quality'

const feed = (m: ReturnType<typeof createQualityMonitor>, n: number, ms: number) => {
  for (let i = 0; i < n; i++) m.sample(ms)
  return m.level
}

describe('quality monitor', () => {
  it('steps down one level after 3 s of slow frames', () => {
    expect(feed(createQualityMonitor('high'), 70, 45)).toBe('normal')
    expect(feed(createQualityMonitor('normal'), 70, 45)).toBe('low')
    expect(feed(createQualityMonitor('high'), 70, 30)).toBe('high')
  })

  it('a phone too slow even for normal goes all the way down, one step at a time', () => {
    const m = createQualityMonitor('high')
    expect(feed(m, 70, 45)).toBe('normal')
    expect(feed(m, 70, 45)).toBe('low')
  })

  it('one fast frame resets the slow streak', () => {
    const m = createQualityMonitor('normal')
    feed(m, 60, 45)
    m.sample(16)
    expect(feed(m, 10, 45)).toBe('normal')
  })

  it('never steps back up', () => {
    const m = createQualityMonitor('normal')
    feed(m, 70, 45)
    expect(feed(m, 500, 10)).toBe('low')
  })

  it('a pause (a battle covering the world, a hidden tab) is not a slow frame', () => {
    const m = createQualityMonitor('high')
    expect(m.sample(30_000)).toBe('high')
    feed(m, 40, 45) // 1.8 s of slow frames
    m.sample(20_000)
    expect(feed(m, 20, 45)).toBe('high') // the pause neither adds to nor ends the streak
    expect(feed(m, 30, 45)).toBe('normal')
  })

  it('a smooth laptop moves up from Normal to High after 4 s of smooth frames', () => {
    expect(feed(createQualityMonitor('normal', { rise: true }), 300, 16)).toBe('high')
    expect(feed(createQualityMonitor('normal', { rise: true }), 300, 30)).toBe('normal') // not smooth enough
    expect(feed(createQualityMonitor('normal'), 300, 16)).toBe('normal') // touch screens never rise
  })

  it('moves up at most once: High that turns out too slow steps back down for good', () => {
    const m = createQualityMonitor('normal', { rise: true })
    feed(m, 300, 16)
    expect(feed(m, 70, 45)).toBe('normal')
    expect(feed(m, 600, 16)).toBe('normal')
  })
})

describe('auto quality', () => {
  const pointer = (fine: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: fine && q.includes('fine') }))
  beforeEach(() => vi.unstubAllGlobals())

  it('may move up to High only with a mouse (laptops and desktops), never on touch screens', () => {
    pointer(true)
    expect(canRise()).toBe(true)
    pointer(false)
    expect(canRise()).toBe(false)
  })
})

describe('quality choice', () => {
  beforeEach(() => localStorage.clear())
  it('saves and loads', () => {
    saveQualityChoice('normal')
    expect(loadQualityChoice()).toBe('normal')
    saveQualityChoice('high')
    expect(loadQualityChoice()).toBe('high')
  })
  it('bad stored choice falls back to auto', () => {
    localStorage.setItem('eduventure.quality2', 'ultra')
    expect(loadQualityChoice()).toBe('auto')
    localStorage.clear()
    expect(loadQualityChoice()).toBe('auto')
  })
  it('a player who picked the old High keeps the same look, now called Normal', () => {
    localStorage.setItem('eduventure.quality', 'high')
    expect(loadQualityChoice()).toBe('normal')
    localStorage.setItem('eduventure.quality', 'low')
    expect(loadQualityChoice()).toBe('low')
  })
})
