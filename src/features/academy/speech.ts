export type SpeechLang = 'english' | 'malay'
type Voice = { lang: string; name: string }

/** The best built-in voice: British then any English; Malay, then any Malay, then Indonesian (very close), else none. */
export function pickVoice<V extends Voice>(voices: V[], lang: SpeechLang): V | null {
  const tag = (v: V) => v.lang.replace('_', '-').toLowerCase()
  const find = (ok: (t: string) => boolean) => voices.find((v) => ok(tag(v))) ?? null
  return lang === 'english'
    ? (find((t) => t === 'en-gb') ?? find((t) => t.startsWith('en')))
    : (find((t) => t === 'ms-my') ?? find((t) => t.startsWith('ms')) ?? find((t) => t.startsWith('id')))
}

const synth = () => (typeof speechSynthesis === 'undefined' ? null : speechSynthesis)

/**
 * The device's voices. Chrome fills the list a moment after the page loads, so wait briefly for it;
 * a device with no voices (or no speech at all) answers with an empty list.
 */
export function loadVoices(waitMs = 800): Promise<SpeechSynthesisVoice[]> {
  const s = synth()
  if (!s) return Promise.resolve([])
  const now = s.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      s.removeEventListener?.('voiceschanged', done)
      clearTimeout(timer)
      resolve(s.getVoices())
    }
    const timer = setTimeout(done, waitMs)
    s.addEventListener?.('voiceschanged', done)
  })
}

export const canSpeak = (lang: SpeechLang) => pickVoice(synth()?.getVoices() ?? [], lang) !== null

/** Says a word or sentence with the best voice for the language (does nothing without one). */
export function speak(text: string, lang: SpeechLang) {
  const s = synth()
  const voice = s && pickVoice(s.getVoices(), lang)
  if (!s || !voice) return
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang
  u.rate = 0.9 // a little slower for learners
  s.cancel()
  s.speak(u)
}
