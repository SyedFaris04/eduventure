import { barNotes, midiToHz, MOODS, type Mood, type Note } from './theory'
import { SFX, type SfxName } from './sfx'
import { useAudioSettings } from './settings'

/**
 * One AudioContext for the whole game: master → (music, effects). Browsers start it suspended until a tap, so every
 * play call also tries to resume it. Without Web Audio (tests, old browsers) everything here does nothing.
 */
let ctx: AudioContext | null = null
let master: GainNode
let musicBus: GainNode
let fxBus: GainNode
let echo: DelayNode
let noise: AudioBuffer
let musicLevel = 1 // 1 normal, lower while battles, lessons or speech need attention

function audio(): AudioContext | null {
  if (ctx) return ctx
  if (typeof AudioContext === 'undefined') return null
  ctx = new AudioContext()
  master = ctx.createGain()
  musicBus = ctx.createGain()
  fxBus = ctx.createGain()
  // A soft echo gives the music some room without a reverb file.
  echo = ctx.createDelay(1)
  echo.delayTime.value = 0.33
  const feedback = ctx.createGain()
  feedback.gain.value = 0.25
  const wet = ctx.createGain()
  wet.gain.value = 0.3
  musicBus.connect(master)
  musicBus.connect(echo)
  echo.connect(feedback).connect(echo)
  echo.connect(wet).connect(master)
  fxBus.connect(master)
  master.connect(ctx.destination)
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  applyVolumes()
  useAudioSettings.subscribe(applyVolumes)
  return ctx
}

function applyVolumes() {
  if (!ctx) return
  const s = useAudioSettings.getState()
  const t = ctx.currentTime
  master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.05)
  musicBus.gain.setTargetAtTime(s.music * musicLevel, t, 0.3)
  fxBus.gain.setTargetAtTime(s.effects, t, 0.05)
}

/** Call from a tap or key press: browsers only start audio after one. */
export function unlockAudio() {
  void audio()?.resume().catch(() => undefined)
}

export function playSfx(name: SfxName) {
  if (useAudioSettings.getState().muted) return
  const c = audio()
  if (!c) return
  void c.resume().catch(() => undefined)
  const start = c.currentTime + 0.01
  for (const p of SFX[name]) {
    const t = start + p.at
    const env = c.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(p.gain, t + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t + p.dur)
    env.connect(fxBus)
    if (p.type === 'noise') {
      const src = c.createBufferSource()
      src.buffer = noise
      const band = c.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = p.freq
      band.Q.value = 0.8
      src.connect(band).connect(env)
      src.start(t, Math.random() * 0.5, p.dur + 0.05)
    } else {
      const osc = c.createOscillator()
      osc.type = p.type
      osc.frequency.setValueAtTime(p.freq, t)
      if (p.to) osc.frequency.exponentialRampToValueAtTime(p.to, t + p.dur * 0.8)
      osc.connect(env)
      osc.start(t)
      osc.stop(t + p.dur + 0.05)
    }
  }
}

/** Music level: 1 normal, 0.5 while questions or lessons are on screen, lower while a word is being spoken. */
export function setMusicLevel(level: number) {
  musicLevel = level
  applyVolumes()
}

// ---------------------------------------------------------------------------------------------------------------
// Music: a lookahead scheduler that writes one bar at a time; moods crossfade.
// ---------------------------------------------------------------------------------------------------------------
type Player = { mood: Mood; out: GainNode; bar: number; nextAt: number; timer: ReturnType<typeof setInterval> | null; file?: HTMLAudioElement }
let current: Player | null = null
let files: Set<string> | null = null

// Owners can drop real tracks in public/assets/audio/ and list them in manifest.json (see docs/art-spec.md).
async function musicFiles(): Promise<Set<string>> {
  if (files) return files
  try {
    const r = await fetch('/assets/audio/manifest.json')
    files = new Set(r.ok ? ((await r.json()) as string[]) : [])
  } catch {
    files = new Set()
  }
  return files
}

function playNote(c: AudioContext, out: GainNode, mood: Mood, n: Note, at: number, beat: number) {
  const t = at + n.at * beat
  const dur = n.dur * beat
  const env = c.createGain()
  env.connect(out)
  if (n.voice === 'pad') {
    // Two slightly detuned soft waves through a low-pass filter: a warm, slow pad.
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    filter.connect(env)
    for (const detune of [-6, 6]) {
      const osc = c.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = midiToHz(n.midi)
      osc.detune.value = detune
      osc.connect(filter)
      osc.start(t)
      osc.stop(t + dur + 1.2)
    }
    env.gain.setValueAtTime(0.0001, t)
    env.gain.linearRampToValueAtTime(0.035, t + Math.min(1.2, dur / 2))
    env.gain.linearRampToValueAtTime(0.0001, t + dur + 1)
    return
  }
  const osc = c.createOscillator()
  osc.type = n.voice === 'bass' ? 'sine' : MOODS[mood].lead
  osc.frequency.value = midiToHz(n.midi)
  osc.connect(env)
  const peak = n.voice === 'bass' ? 0.06 : 0.05
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(peak, t + (n.voice === 'bass' ? 0.08 : 0.01))
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur + (n.voice === 'lead' ? 0.6 : 0.2))
  osc.start(t)
  osc.stop(t + dur + 0.8)
}

function startPlayer(c: AudioContext, mood: Mood, file: boolean): Player {
  const out = c.createGain()
  out.gain.setValueAtTime(0.0001, c.currentTime)
  out.gain.linearRampToValueAtTime(1, c.currentTime + 2)
  out.connect(musicBus)
  const p: Player = { mood, out, bar: 0, nextAt: c.currentTime + 0.1, timer: null }
  if (file) {
    const el = new Audio(`/assets/audio/music-${mood}.mp3`)
    el.loop = true
    c.createMediaElementSource(el).connect(out)
    void el.play().catch(() => undefined)
    p.file = el
    return p
  }
  const beat = 60 / MOODS[mood].bpm
  p.timer = setInterval(() => {
    while (p.nextAt < c.currentTime + 1.2) {
      for (const n of barNotes(mood, p.bar, Math.random)) playNote(c, out, mood, n, p.nextAt, beat)
      p.nextAt += 4 * beat
      p.bar++
    }
  }, 250)
  return p
}

function stopPlayer(c: AudioContext, p: Player) {
  p.out.gain.cancelScheduledValues(c.currentTime)
  p.out.gain.setValueAtTime(p.out.gain.value, c.currentTime)
  p.out.gain.linearRampToValueAtTime(0.0001, c.currentTime + 2)
  if (p.timer) clearInterval(p.timer)
  setTimeout(() => {
    p.file?.pause()
    p.out.disconnect()
  }, 2200)
}

/** Plays a mood (crossfading from the last one); the same mood again changes nothing. */
export async function setMusicMood(mood: Mood) {
  const c = audio()
  if (!c || current?.mood === mood) return
  const old = current
  current = { mood, out: c.createGain(), bar: 0, nextAt: 0, timer: null } // reserve, so a second call doesn't race
  const file = (await musicFiles()).has(`music-${mood}.mp3`)
  if (current.mood !== mood) return
  if (old) stopPlayer(c, old)
  current = startPlayer(c, mood, file)
}
