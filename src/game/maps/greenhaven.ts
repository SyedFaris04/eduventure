import type { MapSource } from '../map'

/**
 * Greenhaven Kampung (the hub), 36 × 36. Each character is one tile; edit freely, the tests check the shape.
 * Columns run down-right on screen, rows run down-left (isometric).
 */
export const GREENHAVEN: MapSource = {
  id: 'greenhaven',
  theme: 'kampung',
  monsters: { sproutling: 4, pebblewing: 3, dinobud: 3 },
  // First match wins where areas overlap.
  areas: [
    { name: 'Jeti Melaka', x0: 13, y0: 31, x1: 21, y1: 35 },
    { name: 'Pasar Malam', x0: 20, y0: 14, x1: 27, y1: 18 },
    { name: 'Kampung Greenhaven', x0: 1, y0: 1, x1: 34, y1: 34 },
  ],
  legend: {
    '.': { tile: 'grass' },
    ',': { tile: 'flowers' },
    '=': { tile: 'path' },
    s: { tile: 'sand' },
    '~': { tile: 'water', blocks: true },
    '#': { tile: 'bridge' },
    T: { tile: 'grass', prop: 'tree', blocks: true },
    b: { tile: 'grass', prop: 'bush', blocks: true },
    R: { tile: 'grass', prop: 'rock', blocks: true },
    f: { tile: 'grass', prop: 'fence', blocks: true },
    W: { tile: 'path', prop: 'well', blocks: true },
    p: { tile: 'grass', prop: 'palm', blocks: true },
    K: { tile: 'path', prop: 'stall', blocks: true }, // pasar malam stall beside the shopkeeper
    J: { tile: 'jetty' },
    B: { tile: 'sand', npc: 'boatman', blocks: true },
    A: { tile: 'path', arrival: true }, // where the boat drops players off
    H: { tile: 'grass', prop: 'kampung_house', blocks: true }, // top-left of a 2 × 2 kampung house on stilts
    h: { tile: 'grass', blocks: true }, // rest of a house
    P: { tile: 'path', spawn: 'player' },
    E: { tile: 'path', npc: 'elder', blocks: true },
    S: { tile: 'path', npc: 'shopkeeper', blocks: true },
    G: { tile: 'path', boss: 'guardian', blocks: true }, // Greenhaven Guardian, at the north end of the road
    '1': { tile: 'grass', zone: 'sproutling' },
    '2': { tile: 'grass', zone: 'pebblewing' },
    '3': { tile: 'flowers', zone: 'dinobud' },
  },
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTT..T...TT...T.......TT.....T...TTT',
    'TT................................TT',
    'T...................p..............T',
    'T...p......p.....G.......111111111.T',
    'T................=...T...11111111b.T',
    'T......p.....p...=.......11b111111.T',
    'T....,,,,........=.....T.111111111.T',
    'T....,,,,........=.......1T1111111.T',
    'TT...........Hh..=....Hh.111111b11.T',
    'TT....p......hh..=....hh.111111111.T',
    'T................=.......1111b1111.T',
    'T........b.p.....========1111111T1TT',
    'T..p........E....=.................T',
    'T...........======.................T',
    'TT...............=...Hh=...........T',
    'T.........b......=...hhSK..........T',
    'T..sssssss....,=====,..............T',
    'T..s~~~~~s.....=====.....b.........T',
    'T..s~~~~~s.....==W==...............T',
    'T..=#####======================...TT',
    'T..s~~~~~s.....=====..............TT',
    'T..s~~~~~s....,=====,..............T',
    'T..s~~~~~sffff...=....,,2222222222.T',
    'T..sssssss,,,,...P....,,222222R222.T',
    'T.........,,,,...=....ff22R2222222.T',
    'T.............b..=======2222222222.T',
    'T..33333333333...=.....=2222222222.T',
    'TT.333333333T=====......2222R22222.T',
    'TT.33T33333333...=......22222222R2.T',
    'T..33333333333...=......2222222222.T',
    'T..333333T3333...=......2R22222222.T',
    'T..3R333333333...A......2222222R22.T',
    'T.T3333T333R33.sBJss..............TT',
    'TTT...T.....T..~~J~~TT.....T.....T.T',
    'TTTTTTTTTTTTTTT~~J~~TTTTTTTTTTTTTTTT',
  ],
}
