/** XP needed to go from `level` to `level + 1`. Mirrors public.xp_to_next() in the database. */
export const xpToNext = (level: number) => Math.round(100 * level ** 1.5)

/** Level and position inside it for a total XP amount. Mirrors public.level_for_xp(). */
export function levelProgress(totalXp: number): { level: number; into: number; needed: number } {
  let level = 1
  let rest = Math.max(0, Math.floor(totalXp))
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level)
    level++
  }
  return { level, into: rest, needed: xpToNext(level) }
}

export const levelForXp = (totalXp: number) => levelProgress(totalXp).level
