import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SFX, SFX_NAMES } from './sfx'
import { useAudioSettings } from './settings'

// A minimal Web Audio stand-in: enough for the engine to run, counting the oscillators the code music starts.
let oscillators = 0
const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} })
const node = () => ({ gain: param(), frequency: param(), detune: param(), delayTime: param(), Q: param(), connect: (n: unknown) => n, disconnect() {}, start() {}, stop() {} })
class FakeContext {
  currentTime = 0
  sampleRate = 44100
  destination = node()
  createGain = node
  createDelay = node
  createBiquadFilter = node
  createBufferSource = node
  createMediaElementSource = node
  createOscillator = () => (oscillators++, node())
  createBuffer = () => ({ getChannelData: () => new Float32Array(8) })
  resume = () => Promise.resolve()
  decodeAudioData = () => Promise.resolve({})
}

beforeEach(() => {
  oscillators = 0
  vi.resetModules()
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(['music-study.mp3']))))
  useAudioSettings.getState().set({ muted: false })
})
afterEach(() => vi.unstubAllGlobals())

describe('recorded music', () => {
  it('falls back to the code music when the browser refuses to play the file', async () => {
    vi.stubGlobal('Audio', class { loop = false; play = () => Promise.reject(new Error('NotAllowedError')); pause() {}; addEventListener() {} })
    const { setMusicMood } = await import('./engine')
    await setMusicMood('study')
    await vi.waitFor(() => expect(oscillators).toBeGreaterThan(0), { timeout: 2000 })
  })

  it('falls back to the code music when the file fails to load', async () => {
    const els: { fire: () => void }[] = []
    vi.stubGlobal('Audio', class {
      loop = false
      onError = () => {}
      constructor() { els.push({ fire: () => this.onError() }) }
      play = () => Promise.resolve()
      pause() {}
      addEventListener(type: string, fn: () => void) { if (type === 'error') this.onError = fn }
    })
    const { setMusicMood } = await import('./engine')
    await setMusicMood('study')
    expect(els).toHaveLength(1)
    els[0].fire()
    await vi.waitFor(() => expect(oscillators).toBeGreaterThan(0), { timeout: 2000 })
  })
})

describe('recorded sound levels', () => {
  it('recorded effects (levelled to a -6 dB peak) play no louder than the loudest code effect', async () => {
    const { RECORDED_TRIM } = await import('./engine')
    const loudestCode = Math.max(...SFX_NAMES.flatMap((n) => SFX[n].map((p) => p.gain)))
    expect(0.5 * RECORDED_TRIM.sfx).toBeLessThanOrEqual(loudestCode)
    expect(RECORDED_TRIM.music).toBeLessThanOrEqual(0.3) // -16 LUFS files sit near the quiet code music
  })
})
