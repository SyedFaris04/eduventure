import { beforeEach, describe, expect, it } from 'vitest'
import { createQualityMonitor, loadQualityChoice, saveQualityChoice } from './quality'

const feed = (m: ReturnType<typeof createQualityMonitor>, n: number, ms: number) => {
  for (let i = 0; i < n; i++) m.sample(ms)
  return m.level
}

describe('quality monitor', () => {
  it('steps down after 3 s of slow frames', () => {
    expect(feed(createQualityMonitor(), 70, 45)).toBe('low')
    expect(feed(createQualityMonitor(), 70, 30)).toBe('high')
  })

  it('one fast frame resets the slow streak', () => {
    const m = createQualityMonitor()
    feed(m, 60, 45)
    m.sample(16)
    expect(feed(m, 10, 45)).toBe('high')
  })

  it('never steps back up', () => {
    const m = createQualityMonitor()
    feed(m, 70, 45)
    expect(feed(m, 500, 10)).toBe('low')
  })
})

describe('quality choice', () => {
  beforeEach(() => localStorage.clear())
  it('saves and loads', () => {
    saveQualityChoice('low')
    expect(loadQualityChoice()).toBe('low')
  })
  it('bad stored choice falls back to auto', () => {
    localStorage.setItem('eduventure.quality', 'ultra')
    expect(loadQualityChoice()).toBe('auto')
    localStorage.clear()
    expect(loadQualityChoice()).toBe('auto')
  })
})
