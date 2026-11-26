/** High adds lush grass, gusts, cloud shadows, butterflies and soft shadows on top of Normal (decision #54). */
export type QualityLevel = 'high' | 'normal' | 'low'
export type QualityChoice = 'auto' | QualityLevel

const DOWN: Record<QualityLevel, QualityLevel> = { high: 'normal', normal: 'low', low: 'low' }

/** Steps down one level each time frames stay slower than `slowMs` for `windowMs`. Never steps back up. */
export function createQualityMonitor(start: QualityLevel, { slowMs = 40, windowMs = 3000 } = {}) {
  let level = start
  let slowFor = 0
  return {
    sample(dtMs: number): QualityLevel {
      slowFor = dtMs > slowMs ? slowFor + dtMs : 0
      if (slowFor > windowMs) {
        level = DOWN[level]
        slowFor = 0
      }
      return level
    },
    get level() {
      return level
    },
  }
}

/** Where "auto" starts: High with a mouse (laptops, desktops), Normal on touch screens; the monitor steps down if slow. */
export const autoStart = (): QualityLevel => (window.matchMedia?.('(pointer: fine)').matches ? 'high' : 'normal')

// A new key: the old one's "high" meant today's Normal, so those players keep the look they chose.
const KEY = 'eduventure.quality2'
const OLD_KEY = 'eduventure.quality'
const CHOICES: QualityChoice[] = ['auto', 'high', 'normal', 'low']

export function loadQualityChoice(): QualityChoice {
  try {
    const v = localStorage.getItem(KEY) as QualityChoice | null
    if (v) return CHOICES.includes(v) ? v : 'auto'
    const old = localStorage.getItem(OLD_KEY)
    return old === 'high' ? 'normal' : old === 'low' ? 'low' : 'auto'
  } catch {
    return 'auto'
  }
}

export function saveQualityChoice(c: QualityChoice) {
  try {
    localStorage.setItem(KEY, c)
  } catch {
    // Private mode or blocked storage: the choice just lasts this visit.
  }
}
