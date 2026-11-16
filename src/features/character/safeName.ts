import { z } from 'zod'
import nameParts from './nameParts.json'

/** "<Adjective> <Noun>" from the same lists the database accepts for guests and under-13 players. */
export function generateSafeName(rng: () => number = Math.random): string {
  const pick = (list: string[]) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))]
  return `${pick(nameParts.adjectives)} ${pick(nameParts.nouns)}`
}

// shortcut: a tiny blocklist only; real moderation (reports, review, wider word lists) arrives with chat in Phase 5.
const BLOCKED = ['admin', 'moderator', 'eduventure', 'official']

/** Free-text names for teen and adult players: letters, digits and single spaces, 3–16 characters. */
export const nameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(3, 'character.validation.length')
      .max(16, 'character.validation.length')
      .regex(/^[\p{L}\p{N} ]+$/u, 'character.validation.characters')
      .refine((s) => !BLOCKED.some((w) => s.toLowerCase().includes(w)), 'character.validation.reserved'),
  )
