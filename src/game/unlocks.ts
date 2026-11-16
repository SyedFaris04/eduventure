export type UnlockKind = 'helper' | 'boss' | 'shop_tier' | 'boat' | 'title'
export type Unlock = { level: number; kind: UnlockKind; key: string }

/** Copy of public.level_unlocks (tests/rls/unlocks.test.ts checks they match). The server enforces every gate. */
export const UNLOCKS: Unlock[] = [
  { level: 3, kind: 'helper', key: 'second_chance' },
  { level: 4, kind: 'title', key: 'kampung_hero' },
  { level: 5, kind: 'boss', key: 'island_bosses' },
  { level: 5, kind: 'shop_tier', key: 'rare' },
  { level: 7, kind: 'boat', key: 'swift_perahu' },
  { level: 8, kind: 'helper', key: 'fifty' },
  { level: 10, kind: 'shop_tier', key: 'epic' },
  { level: 10, kind: 'title', key: 'island_explorer' },
  { level: 15, kind: 'title', key: 'scholar_of_the_seas' },
]

/** Level an unlock arrives at; common shop items are always open; unknown keys never unlock. */
export function unlockLevel(kind: UnlockKind, key: string): number | null {
  if (kind === 'shop_tier' && key === 'common') return 1
  return UNLOCKS.find((u) => u.kind === kind && u.key === key)?.level ?? null
}

export function isUnlocked(level: number, kind: UnlockKind, key: string): boolean {
  const at = unlockLevel(kind, key)
  return at !== null && level >= at
}

/** What a level-up from `oldLevel` to `newLevel` brings. */
export const newUnlocks = (oldLevel: number, newLevel: number) => UNLOCKS.filter((u) => u.level > oldLevel && u.level <= newLevel)

export const TITLES = UNLOCKS.filter((u) => u.kind === 'title')
