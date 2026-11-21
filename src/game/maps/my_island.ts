import type { MapSource } from '../map'

/**
 * My island: each player's own island to build on (decision #48), 32 × 32. The grass in x and y 4–27 is the build
 * area (the server checks placements against it: island_fits); sand rings it; the jetty and the boatman are in the
 * south. No monsters, harvest nodes or camp: materials come from the other islands. Generated once; edit freely.
 */
export const MY_ISLAND: MapSource = {
  id: 'my_island',
  theme: 'kampung',
  monsters: {},
  areas: [],
  legend: {
    '.': { tile: 'grass' },
    s: { tile: 'sand' },
    '~': { tile: 'water', blocks: true },
    J: { tile: 'jetty' },
    B: { tile: 'sand', npc: 'boatman', blocks: true },
    A: { tile: 'sand', arrival: true },
    P: { tile: 'sand', spawn: 'player' },
  },
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~ssssssssssssssssssssssssssss~~',
    '~~ssssssssssssssssssssssssssss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ss........................ss~~',
    '~~ssssssssssssssPsssssssssssss~~',
    '~~ssssssssssssBAssssssssssssss~~',
    '~~~~~~~~~~~~~~~JJ~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~JJ~~~~~~~~~~~~~~~',
  ],
}
