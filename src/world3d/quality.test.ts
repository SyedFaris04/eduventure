import { beforeEach, describe, expect, it, vi } from 'vitest'
import { autoStart, createQualityMonitor, loadQualityChoice, saveQualityChoice } from './quality'

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
})

describe('auto quality', () => {
  const pointer = (fine: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: fine && q.includes('fine') }))
  beforeEach(() => vi.unstubAllGlobals())

  it('starts on High with a mouse (laptops and desktops), Normal on touch screens', () => {
    pointer(true)
    expect(autoStart()).toBe('high')
    pointer(false)
    expect(autoStart()).toBe('normal')
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
