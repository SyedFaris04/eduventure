import { Easing, interpolate } from 'remotion'

export const sec = (s: number, fps = 30) => Math.round(s * fps)
/** Frames for n beats at a tempo (cuts land on the music's beat). */
export const beats = (n: number, bpm: number, fps = 30) => Math.round((n * 60 * fps) / bpm)
export const ease = Easing.bezier(0.33, 1, 0.68, 1)
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1)
/** 0→1 over [a, b] frames, clamped and eased. */
export const prog = (f: number, a: number, b: number, e = ease) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e })
