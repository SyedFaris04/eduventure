/** High adds lush grass, gusts, cloud shadows, butterflies and soft shadows on top of Normal (decision #54). */
export type QualityLevel = 'high' | 'normal' | 'low'
export type QualityChoice = 'auto' | QualityLevel

const DOWN: Record<QualityLevel, QualityLevel> = { high: 'normal', normal: 'low', low: 'low' }
const PAUSE_MS = 1000 // a longer "frame" is the world not drawing (a battle over it, a hidden tab), not slowness

/**
 * Auto graphics. Steps down one level each time frames stay slower than `slowMs` for `windowMs`. With `rise`, it moves
 * up once from Normal to High after `riseMs` of smooth frames; after any step it never moves up again.
 */
export function createQualityMonitor(start: QualityLevel, { slowMs = 40, windowMs = 3000, rise = false, smoothMs = 22, riseMs = 4000 } = {}) {
  let level = start
  let slowFor = 0
  let smoothFor = 0
  let canRise = rise
  return {
    sample(dtMs: number): QualityLevel {
      if (dtMs > PAUSE_MS) return level
      slowFor = dtMs > slowMs ? slowFor + dtMs : 0
      if (dtMs > slowMs) smoothFor = 0
      else if (dtMs < smoothMs) smoothFor += dtMs
      if (slowFor > windowMs) {
        level = DOWN[level]
        slowFor = 0
        canRise = false
      } else if (canRise && level === 'normal' && smoothFor > riseMs) {
        level = 'high'
        canRise = false
      }
      return level
    },
    get level() {
      return level
    },
  }
}

/** Auto starts on Normal everywhere; with a mouse (laptops, desktops) it may move up to High once play is smooth. */
export const canRise = () => Boolean(window.matchMedia?.('(pointer: fine)').matches)

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
