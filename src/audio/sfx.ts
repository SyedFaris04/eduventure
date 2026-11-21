/**
 * Sound effects as data: short tones and filtered noise with soft envelopes. Never harsh waveforms for mistakes,
 * so a wrong answer sounds like "try again", not like a buzzer. Times in seconds, gain at most 0.3.
 */
export type SfxPart = { type: OscillatorType | 'noise'; freq: number; to?: number; at: number; dur: number; gain: number }

const chime = (notes: number[], step: number, dur = 0.35, gain = 0.12, type: OscillatorType = 'sine'): SfxPart[] =>
  notes.map((freq, i) => ({ type, freq, at: i * step, dur, gain }))

export const SFX = {
  tap: chime([880, 1320], 0.05, 0.18, 0.08),
  correct: chime([660, 880, 1320], 0.07, 0.35, 0.12),
  wrong: [
    { type: 'triangle', freq: 392, to: 330, at: 0, dur: 0.35, gain: 0.1 },
    { type: 'sine', freq: 294, at: 0.12, dur: 0.4, gain: 0.08 },
  ],
  victory: chime([523, 659, 784, 1047, 1319], 0.09, 0.55, 0.13),
  defeat: [
    { type: 'sine', freq: 523, to: 440, at: 0, dur: 0.5, gain: 0.09 },
    { type: 'sine', freq: 392, to: 349, at: 0.25, dur: 0.6, gain: 0.08 },
  ],
  coin: chime([1568, 2093], 0.06, 0.25, 0.08, 'triangle'),
  levelup: [...chime([523, 659, 784, 1047], 0.08, 0.4, 0.12, 'triangle'), { type: 'sine', freq: 1568, at: 0.36, dur: 0.9, gain: 0.1 }],
  mission: chime([784, 988, 1175, 1568], 0.07, 0.4, 0.11),
  step: [{ type: 'noise', freq: 500, at: 0, dur: 0.06, gain: 0.05 }],
  // A slash at a tree or herb bush (a soft woody thock), and at a rock or crystal (a bright little clink).
  chop: [{ type: 'noise', freq: 700, at: 0, dur: 0.09, gain: 0.12 }, { type: 'sine', freq: 220, to: 160, at: 0, dur: 0.1, gain: 0.1 }],
  clink: [{ type: 'triangle', freq: 1760, to: 1480, at: 0, dur: 0.12, gain: 0.08 }, { type: 'noise', freq: 3000, at: 0, dur: 0.05, gain: 0.05 }],
  splash: [
    { type: 'noise', freq: 900, at: 0, dur: 0.5, gain: 0.12 },
    { type: 'noise', freq: 2200, at: 0.08, dur: 0.35, gain: 0.06 },
  ],
  hop: [{ type: 'sine', freq: 300, to: 520, at: 0, dur: 0.14, gain: 0.08 }],
  chirp: [
    { type: 'sine', freq: 1800, to: 2600, at: 0, dur: 0.1, gain: 0.07 },
    { type: 'sine', freq: 2000, to: 2900, at: 0.13, dur: 0.12, gain: 0.07 },
  ],
  sparkle: chime([1319, 1568, 1976, 2349, 2637, 3136], 0.06, 0.5, 0.07),
  buy: [...chime([1047, 1568], 0.07, 0.3, 0.09, 'triangle'), { type: 'noise', freq: 4000, at: 0, dur: 0.08, gain: 0.04 }],
  lesson: chime([587, 740, 880, 1175], 0.1, 0.6, 0.11),
} satisfies Record<string, SfxPart[]>

export type SfxName = keyof typeof SFX
export const SFX_NAMES = Object.keys(SFX) as SfxName[]
