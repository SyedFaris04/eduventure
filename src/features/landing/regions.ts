/** The 12 world regions from the brief, in brief order. `phase` is the roadmap phase that opens it. */
export const REGIONS = [
  { id: 'greenhaven', phase: 2, colour: '#8bc34a', open: true },
  { id: 'knowledge_forest', phase: 9, colour: '#4f9a5a' },
  { id: 'mathematics_mountains', phase: 9, colour: '#8fa3c7', open: true },
  { id: 'science_island', phase: 9, colour: '#4fa3c7', open: true },
  { id: 'language_kingdom', phase: 9, colour: '#c77fb0' },
  { id: 'history_ruins', phase: 9, colour: '#c9a46b' },
  { id: 'technology_city', phase: 9, colour: '#6b8fd6', open: true },
  { id: 'university_district', phase: 9, colour: '#a3754f' },
  { id: 'monster_wilderness', phase: 9, colour: '#9c7b3c' },
  { id: 'clan_territory', phase: 5, colour: '#d9894a' },
  { id: 'ancient_dungeon', phase: 9, colour: '#7a6a8f' },
  { id: 'world_boss_arena', phase: 6, colour: '#e2574c' },
] as const

export type RegionId = (typeof REGIONS)[number]['id']
