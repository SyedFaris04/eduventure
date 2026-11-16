export type QualityLevel = 'high' | 'low'
export type QualityChoice = 'auto' | QualityLevel

/** Steps down to low quality once frames stay slower than `slowMs` for `windowMs`. Never steps back up. */
export function createQualityMonitor({ slowMs = 40, windowMs = 3000 } = {}) {
  let level: QualityLevel = 'high'
  let slowFor = 0
  return {
    sample(dtMs: number): QualityLevel {
      slowFor = dtMs > slowMs ? slowFor + dtMs : 0
      if (slowFor > windowMs) level = 'low'
      return level
    },
    get level() {
      return level
    },
  }
}

const KEY = 'eduventure.quality'
const CHOICES: QualityChoice[] = ['auto', 'high', 'low']

export function loadQualityChoice(): QualityChoice {
  try {
    const v = localStorage.getItem(KEY) as QualityChoice | null
    return v && CHOICES.includes(v) ? v : 'auto'
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
