/** Island camp boards: the sticker and phrase keys the server accepts, and the daily question. */

export const STICKERS = ['star', 'heart', 'thumbs_up', 'clap', 'idea', 'book', 'rocket', 'trophy', 'smile', 'party', 'plant', 'question'] as const
export type StickerKey = (typeof STICKERS)[number]
export const STICKER_ICON: Record<StickerKey, string> = {
  star: '⭐', heart: '❤️', thumbs_up: '👍', clap: '👏', idea: '💡', book: '📚',
  rocket: '🚀', trophy: '🏆', smile: '😊', party: '🎉', plant: '🌱', question: '❓',
}

export const PHRASES = Array.from({ length: 20 }, (_, i) => `p${String(i + 1).padStart(2, '0')}`)
export const QUESTION_COUNT = 14
export const MAX_BODY = 120

const DAY = 86_400_000
const KL_OFFSET = 8 * 3_600_000 // Malaysia has no daylight saving

/** Index of today's discussion question; the day turns at midnight in Kuala Lumpur. */
export function dailyQuestion(now: Date): number {
  return Math.floor((now.getTime() + KL_OFFSET) / DAY) % QUESTION_COUNT
}

// The same characters the server's text_ok accepts: Latin letters (with accents), digits and plain punctuation.
const ALLOWED = /^[A-Za-z0-9À-ÖØ-öø-ÿĀ-ſ .,!?'"():;+=/%*&#@_’‘“”-]*$/u

/** A hint before sending; the server decides (words, phone numbers, links and so on are only checked there). */
export function bodyProblem(text: string): null | 'script' | 'long' {
  if (!ALLOWED.test(text)) return 'script'
  if (text.trim().length > MAX_BODY) return 'long'
  return null
}
