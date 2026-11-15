const KEY = 'eduventure.sound'
let ctx: AudioContext | null = null

export function getSoundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // private mode: setting lasts for this visit only
  }
}

const NOTES = {
  tap: [880, 1320],
  pop: [660, 990],
  done: [523, 659, 784, 1047],
} as const

/**
 * Tiny synthesized chime, no audio files. Browsers only allow audio after a user gesture,
 * so the first call must come from a click (the sound toggle or a character tap).
 */
export function playChime(kind: keyof typeof NOTES) {
  if (!getSoundEnabled() || typeof AudioContext === 'undefined') return
  ctx ??= new AudioContext()
  void ctx.resume()
  const start = ctx.currentTime
  NOTES[kind].forEach((freq, i) => {
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    const t = start + i * 0.08
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    osc.connect(gain).connect(ctx!.destination)
    osc.start(t)
    osc.stop(t + 0.3)
  })
}
