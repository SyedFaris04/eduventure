import type { MapSource } from '../map'

/**
 * Greenhaven Kampung (the hub), 52 × 52. Each character is one tile; edit freely, the tests check the shape.
 * Columns run down-right on screen, rows run down-left (isometric).
 */
export const GREENHAVEN: MapSource = {
  id: 'greenhaven',
  theme: 'kampung',
  monsters: { sproutling: 6, pebblewing: 5, dinobud: 5 },
  // First match wins where areas overlap.
  areas: [
    { name: 'Kem Greenhaven', x0: 20, y0: 3, x1: 31, y1: 11 },
    { name: 'Hutan Greenhaven', x0: 1, y0: 1, x1: 18, y1: 15 },
    { name: 'Lereng Batu', x0: 33, y0: 1, x1: 50, y1: 15 },
    { name: 'Padang Herba', x0: 37, y0: 16, x1: 50, y1: 45 },
    { name: 'Jeti Melaka', x0: 13, y0: 47, x1: 21, y1: 51 },
    { name: 'Pasar Malam', x0: 20, y0: 30, x1: 27, y1: 34 },
    { name: 'Kampung Greenhaven', x0: 1, y0: 17, x1: 34, y1: 50 },
  ],
  legend: {
    t: { tile: 'grass', prop: 'harvest_tree', blocks: true }, // harvest tree (wood)
    o: { tile: 'grass', prop: 'harvest_rock', blocks: true }, // rock node (stone)
    c: { tile: 'grass', prop: 'crystal', blocks: true }, // crystal rock (needs a pickaxe)
    v: { tile: 'grass', prop: 'herb', blocks: true }, // herb bush
    k: { tile: 'grass', prop: 'workbench', blocks: true }, // camp workbench
    n: { tile: 'grass', prop: 'camp_bench' }, // camp build spot: bench (drawn once built)
    l: { tile: 'grass', prop: 'camp_lantern' }, // camp build spot: lantern
    a: { tile: 'grass', prop: 'camp_flag' }, // camp build spot: flag
    z: { tile: 'grass', prop: 'whiteboard' }, // camp build spot: whiteboard stand
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
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T..........,............,.............,............T',
    'T.t.....,.t.tttt.,................,.....oo.........T',
    'T.t..tt.....tttt.........................,oo.,.....T',
    'T.....t..t..t..ttt.......a.....................o.o.T',
    'T...t..tt,..................................ooc.o..T',
    'T................t.......k........,....c..,......o.T',
    'T..t..ttt..t......................,.o...,....,o..o.T',
    'T...tt.t.t.t.t........n......l.....o..,,...........T',
    'T.........t1111111........z.....,..o..o..oo.o..o.,,T',
    'T......tt.t1111111....................o...o.....co.T',
    'T.t.....tt.1111111..============...................T',
    'T.....t.tt.1111111...,....=.........c...o...o.o.oo.T',
    'T...t.tt...1111111........=.......,....o......o..o.T',
    'T.........................=........................T',
    'T.....,........,........,.=.......,.,..............T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTT=TTTTTTTTT..,,...........T',
    'TTT..T...TT...T.......TT.....T...TTT....,,.........T',
    'TT................................TT..v...........,T',
    'T...................p..............T......,..v.....T',
    'T...p......p.....G.......111111111.T...............T',
    'T................=...T...11111111b.T....,..........T',
    'T......p.....p...=.......11b111111.T..v..v..v......T',
    'T....,,,,........=.....T.111111111.T...v...........T',
    'T....,,,,........=.......1T1111111.T....vv.....vv..T',
    'TT...........Hh..=....Hh.111111b11.T...............T',
    'TT....p......hh..=....hh.111111111.T....,,.v.....,.T',
    'T................=.......1111b1111.T.............v.T',
    'T........b.p.....========1111111T1TT...............T',
    'T..p........E....=.................T..,......v.....T',
    'T...........======.................T..vv.......v...T',
    'TT...............=...Hh=...........T....,.......,..T',
    'T.........b......=...hhSK..........T...............T',
    'T..sssssss....,=====,..............T....,.......,..T',
    'T..s~~~~~s.....=====.....b.........=======.........T',
    'T..s~~~~~s.....==W==...............T..222222222222.T',
    'T..=#####======================...TT..222222222222.T',
    'T..s~~~~~s.....=====..............TT..222222222222.T',
    'T..s~~~~~s....,=====,..............T..222222222222.T',
    'T..s~~~~~sffff...=....,,2222222222.T..222222222222.T',
    'T..sssssss,,,,...P....,,222222R222.T..222222222222.T',
    'T.........,,,,...=....ff22R2222222.T..222222222222.T',
    'T.............b..=======2222222222.T..222222222222.T',
    'T..33333333333...=.....=2222222222.T..222222222222.T',
    'TT.333333333T=====......2222R22222.T..222222222222.T',
    'TT.33T33333333...=......22222222R2.T...............T',
    'T..33333333333...=......2222222222.TTTTTTTTTTTTTTTTT',
    'T..333333T3333...=......2R22222222.T~~~~~~~~~~~~~~~~',
    'T..3R333333333...A......2222222R22.T~~~~~~~~~~~~~~~~',
    'T.T3333T333R33.sBJss..............TT~~~~~~~~~~~~~~~~',
    'TTT...T.....T..~~J~~TT.....T.....T.T~~~~~~~~~~~~~~~~',
    'TTTTTTTTTTTTTTT~~J~~TTTTTTTTTTTTTTTT~~~~~~~~~~~~~~~~',
  ],
}
