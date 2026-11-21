import { barNotes, midiToHz, MOODS, type Mood, type Note } from './theory'
import { SFX, SFX_NAMES, type SfxName } from './sfx'
import { useAudioSettings } from './settings'
import { withBase } from '../app/base'

/**
 * One AudioContext for the whole game: master → (music, effects). Browsers start it suspended until a tap, so every
 * play call also tries to resume it. Without Web Audio (tests, old browsers) everything here does nothing.
 */
let ctx: AudioContext | null = null
let master: GainNode
let musicBus: GainNode
let synthBus: GainNode // code-made music, which gets the echo; recorded tracks have their own room
let fxBus: GainNode
let recordedFx: GainNode
let echo: DelayNode
/** Recorded files are levelled loud (music -16 LUFS, effects -6 dB peak); these trims sit them beside the code sounds. */
export const RECORDED_TRIM = { music: 0.25, sfx: 0.25 }
let noise: AudioBuffer
let musicLevel = 1 // 1 normal, lower while battles, lessons or speech need attention

function audio(): AudioContext | null {
  if (ctx) return ctx
  if (typeof AudioContext === 'undefined') return null
  ctx = new AudioContext()
  master = ctx.createGain()
  musicBus = ctx.createGain()
  synthBus = ctx.createGain()
  fxBus = ctx.createGain()
  // A soft echo gives the music some room without a reverb file.
  echo = ctx.createDelay(1)
  echo.delayTime.value = 0.33
  const feedback = ctx.createGain()
  feedback.gain.value = 0.25
  const wet = ctx.createGain()
  wet.gain.value = 0.3
  musicBus.connect(master)
  synthBus.connect(musicBus)
  synthBus.connect(echo)
  echo.connect(feedback).connect(echo)
  echo.connect(wet).connect(musicBus)
  fxBus.connect(master)
  recordedFx = ctx.createGain()
  recordedFx.gain.value = RECORDED_TRIM.sfx
  recordedFx.connect(fxBus)
  master.connect(ctx.destination)
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  applyVolumes()
  useAudioSettings.subscribe(applyVolumes)
  void loadRecorded(ctx)
  return ctx
}

// Recorded effects (CC0 files listed in the manifest) replace the code sounds once decoded; until then, or when a
// file is missing or fails, the code sound plays.
const recorded = new Map<SfxName, AudioBuffer>()

/** The effects that have a recorded file in the manifest list. */
export function recordedSfx(list: Iterable<string>): SfxName[] {
  return [...list].map((f) => /^sfx-([a-z]+)\.mp3$/.exec(f)?.[1]).filter((n): n is SfxName => SFX_NAMES.includes(n as SfxName))
}

async function loadRecorded(c: AudioContext) {
  await Promise.all(
    recordedSfx(await audioFiles()).map(async (name) => {
      try {
        const r = await fetch(withBase(`/assets/audio/sfx-${name}.mp3`))
        if (r.ok) recorded.set(name, await c.decodeAudioData(await r.arrayBuffer()))
      } catch {
        // Keep the code sound.
      }
    }),
  )
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
  const clip = recorded.get(name)
  if (clip) {
    const src = c.createBufferSource()
    src.buffer = clip
    src.connect(recordedFx)
    src.start(start)
    return
  }
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
let files: Promise<Set<string>> | null = null

// Recorded tracks and effects in public/assets/audio/, listed in manifest.json (see docs/art-spec.md and CREDITS.md).
function audioFiles(): Promise<Set<string>> {
  files ??= fetch(withBase('/assets/audio/manifest.json'))
    .then(async (r) => new Set(r.ok ? ((await r.json()) as string[]) : []))
    .catch(() => new Set<string>())
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
  out.connect(file ? musicBus : synthBus)
  const p: Player = { mood, out, bar: 0, nextAt: c.currentTime + 0.1, timer: null }
  if (file) {
    const el = new Audio(withBase(`/assets/audio/music-${mood}.mp3`))
    el.loop = true
    const trim = c.createGain()
    trim.gain.value = RECORDED_TRIM.music
    c.createMediaElementSource(el).connect(trim).connect(out)
    // Refused (iOS without a fresh tap) or failed to load (offline): play the code music rather than nothing.
    const fallback = () => {
      if (current !== p) return
      stopPlayer(c, p)
      current = startPlayer(c, mood, false)
    }
    el.addEventListener('error', fallback)
    void el.play().catch(fallback)
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
  const file = (await audioFiles()).has(`music-${mood}.mp3`)
  if (current.mood !== mood) return
  if (old) stopPlayer(c, old)
  current = startPlayer(c, mood, file)
}
