import { setSpeaking } from '../../audio/director'
export type SpeechLang = 'english' | 'malay' | 'arabic' | 'japanese' | 'korean' | 'mandarin'
type Voice = { lang: string; name: string }

/**
 * Voice tags to try, best first; each matches exactly or as a prefix ("en" matches "en-US"). Malay falls back to
 * Indonesian (very close). Mandarin never takes a Hong Kong voice: those speak Cantonese.
 */
const PREFER: Record<SpeechLang, string[]> = {
  english: ['en-gb', 'en'],
  malay: ['ms-my', 'ms', 'id'],
  arabic: ['ar'],
  japanese: ['ja'],
  korean: ['ko'],
  mandarin: ['zh-cn', 'cmn', 'zh-sg', 'zh-tw'],
}

/** The best built-in voice for a course language, or none. */
export function pickVoice<V extends Voice>(voices: V[], lang: SpeechLang): V | null {
  const tag = (v: V) => v.lang.replace('_', '-').toLowerCase()
  for (const p of PREFER[lang]) {
    const v = voices.find((x) => tag(x) === p || tag(x).startsWith(`${p}-`))
    if (v) return v
  }
  return null
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
  // The music steps back while a word is spoken.
  u.onend = u.onerror = () => setSpeaking(false)
  setSpeaking(true)
  s.cancel()
  s.speak(u)
}
