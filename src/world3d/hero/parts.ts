import { Euler, Quaternion, Vector3 } from 'three'
import { sanitizeAppearance, type Appearance, type AppearancePart } from '../../features/character/appearance'

/**
 * The hero as data: every appearance value becomes a list of simple shapes, each fixed to one bone of the
 * KayKit rig (in that bone's own space, so animations move them). `buildHero` turns the list into meshes.
 * Proportions come from the rig's rest pose: neck at y 1.24, chest 0.97, hips 0.41, model faces +z, and
 * limb bones point along their own +y.
 */
export type BoneName =
  | 'hips' | 'spine' | 'chest' | 'head'
  | 'upperarm.l' | 'upperarm.r' | 'lowerarm.l' | 'lowerarm.r' | 'hand.l' | 'hand.r' | 'handslot.l' | 'handslot.r'
  | 'upperleg.l' | 'upperleg.r' | 'lowerleg.l' | 'lowerleg.r' | 'foot.l' | 'foot.r'

/** Unit shapes, each filling a 1 × 1 × 1 box centred on the origin (a dome sits on y = 0). `eyes:*` and `mouth:*` are drawn face planes. */
export type Shape = 'rbox' | 'box' | 'sphere' | 'dome' | 'capsule' | 'cone' | 'cylinder' | 'flare' | 'ring' | 'arc' | 'octa' | `eyes:${string}` | `mouth:${string}`
type V3 = [number, number, number]
export type PartSpec = { slot: AppearancePart | 'skin'; bone: BoneName; shape: Shape; colour: string; offset: V3; scale: V3; rotation?: V3 }

const INK = '#2e2a3a'
const GOLD = '#f7c843'
const WHITE = '#f6f1e4'
const PI = Math.PI

export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.max(0, Math.min(255, Math.round(c * (1 + amount)))))
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

const SIDES = ['l', 'r'] as const
const sx = (side: 'l' | 'r') => (side === 'l' ? 1 : -1) // the hero's left is +x
const BODY_WIDTH = { a: 1, b: 1.12, c: 0.9 } as const
// The foot bone points down toward the toes; this turns a box back to lie flat on the ground.
const FOOT_FLAT: V3 = [-0.81, 0, 0]

type P = (slot: PartSpec['slot'], bone: BoneName, shape: Shape, colour: string, offset: V3, scale: V3, rotation?: V3) => PartSpec
const p: P = (slot, bone, shape, colour, offset, scale, rotation) => ({ slot, bone, shape, colour, offset, scale, ...(rotation ? { rotation } : {}) })

function skin(a: Appearance, w: number, longSleeves: boolean, bareShins: boolean): PartSpec[] {
  const s = a.skin
  return [
    p('skin', 'head', 'rbox', s, [0, 0.48, 0.02], [1, 0.92, 0.9]),
    ...SIDES.map((side) => p('skin', 'head', 'sphere', s, [sx(side) * 0.5, 0.44, 0], [0.16, 0.2, 0.14])),
    p('skin', 'chest', 'cylinder', shade(s, -0.12), [0, 0.22, 0], [0.24 * w, 0.16, 0.24]),
    ...SIDES.map((side) => p('skin', `hand.${side}`, 'sphere', s, [0, 0.07, 0], [0.22, 0.22, 0.22])),
    ...(longSleeves ? [] : SIDES.map((side) => p('skin', `lowerarm.${side}`, 'capsule', s, [0, 0.13, 0], [0.17, 0.3, 0.17]))),
    ...(bareShins ? SIDES.map((side) => p('skin', `lowerleg.${side}`, 'capsule', s, [0, 0.08, 0], [0.18, 0.24, 0.18])) : []),
  ]
}

function face(a: Appearance): PartSpec[] {
  return [p('eyes', 'head', `eyes:${a.eyes}`, INK, [0, 0.5, 0.471], [0.74, 0.3, 1]), p('face', 'head', `mouth:${a.face}`, INK, [0, 0.26, 0.471], [0.44, 0.22, 1])]
}

const LONG_SLEEVES = new Set(['hoodie_orange', 'robe_purple', 'scholar_coat', 'knight_tabard', 'star_cloak'])

function top(a: Appearance, w: number): PartSpec[] {
  const torso = (c: string) => p('top', 'spine', 'rbox', c, [0, 0.27, 0], [0.62 * w, 0.58, 0.48])
  const sleeves = (c: string, long: boolean) =>
    SIDES.flatMap((side) => [
      p('top', `upperarm.${side}`, 'capsule', c, [0, 0.12, 0], [0.21, 0.32, 0.21]),
      ...(long ? [p('top', `lowerarm.${side}`, 'capsule', c, [0, 0.13, 0], [0.19, 0.32, 0.19])] : []),
    ])
  const front = 0.245
  switch (a.top) {
    case 'tunic_green':
      return [torso('#6fae4a'), ...sleeves('#6fae4a', false), p('top', 'spine', 'box', '#8a5a3b', [0, 0.1, 0], [0.64 * w, 0.07, 0.5]), p('top', 'spine', 'box', GOLD, [0, 0.1, front + 0.01], [0.09, 0.09, 0.03])]
    case 'vest_blue':
      return [torso(WHITE), ...sleeves(WHITE, false), ...SIDES.map((side) => p('top', 'spine', 'box', '#4f7fc7', [sx(side) * 0.17 * w, 0.27, front], [0.2 * w, 0.54, 0.03]))]
    case 'hoodie_orange':
      return [torso('#f2994a'), ...sleeves('#f2994a', true), p('top', 'chest', 'dome', '#e8893a', [0, 0.16, -0.22], [0.66, 0.34, 0.3], [-0.5, 0, 0]), p('top', 'spine', 'rbox', '#e8893a', [0, 0.12, front], [0.3, 0.14, 0.04])]
    case 'robe_purple':
      return [torso('#7e5bb5'), ...sleeves('#7e5bb5', true), p('top', 'hips', 'flare', '#7e5bb5', [0, -0.14, 0], [0.84 * w, 0.5, 0.68]), p('top', 'hips', 'ring', GOLD, [0, -0.36, 0], [0.84 * w, 0.68, 0.2], [PI / 2, 0, 0]), p('top', 'spine', 'octa', GOLD, [0, 0.36, front + 0.02], [0.14, 0.14, 0.05])]
    case 'dress_pink':
      return [torso('#e88fb4'), ...sleeves('#e88fb4', false), p('top', 'hips', 'flare', '#e88fb4', [0, -0.1, 0], [0.8 * w, 0.4, 0.66]), p('top', 'hips', 'ring', WHITE, [0, -0.24, 0], [0.76 * w, 0.62, 0.15], [PI / 2, 0, 0])]
    case 'scholar_coat':
      return [torso('#3d5a80'), ...sleeves('#3d5a80', true), p('top', 'hips', 'flare', '#3d5a80', [0, -0.08, 0], [0.7 * w, 0.32, 0.56]), p('top', 'spine', 'cone', WHITE, [0, 0.44, front], [0.22, 0.2, 0.03], [0, 0, PI]), ...[0.3, 0.16].map((y) => p('top', 'spine', 'sphere', GOLD, [0.05, y, front + 0.01], [0.05, 0.05, 0.03]))]
    case 'knight_tabard':
      return [torso('#9aa3b0'), ...sleeves('#9aa3b0', true), p('top', 'spine', 'box', '#d9534f', [0, 0.2, front + 0.01], [0.34, 0.66, 0.03]), p('top', 'spine', 'box', GOLD, [0, 0.27, front + 0.03], [0.06, 0.3, 0.02]), p('top', 'spine', 'box', GOLD, [0, 0.3, front + 0.03], [0.22, 0.06, 0.02])]
    case 'star_cloak':
      return [
        torso('#283a6b'),
        ...sleeves('#283a6b', true),
        p('top', 'chest', 'box', '#283a6b', [0, -0.28, -0.27], [0.82 * w, 0.98, 0.05], [0.12, 0, 0]),
        ...([[-0.2, -0.1], [0.18, -0.3], [-0.1, -0.55], [0.22, -0.62], [0, -0.32]] as const).map(([x, y]) => p('top', 'chest', 'octa', GOLD, [x * w, y, -0.31], [0.1, 0.1, 0.03])),
        p('top', 'chest', 'sphere', GOLD, [0, 0.12, front], [0.1, 0.1, 0.05]),
      ]
    default: // scarf_red: explorer shirt with a red scarf, like the hero of the loading art
      return [
        torso(WHITE),
        ...sleeves(WHITE, false),
        ...SIDES.map((side) => p('top', 'spine', 'box', '#5b8ed6', [sx(side) * 0.21 * w, 0.27, front], [0.12 * w, 0.54, 0.03])),
        p('top', 'chest', 'ring', '#e2574c', [0, 0.16, 0], [0.62 * w, 0.52, 0.5], [PI / 2, 0, 0]),
        p('top', 'chest', 'box', '#d9534f', [-0.12, -0.05, front + 0.02], [0.1, 0.32, 0.04], [0, 0, 0.35]),
      ]
  }
}

function bottom(a: Appearance, w: number): PartSpec[] {
  const legs = (c: string, full: boolean, slim = 1) =>
    SIDES.flatMap((side) => [
      p('bottom', `upperleg.${side}`, 'capsule', c, [0, 0.12, 0], [0.23 * slim, 0.32, 0.23 * slim]),
      ...(full ? [p('bottom', `lowerleg.${side}`, 'capsule', c, [0, 0.08, 0], [0.2 * slim, 0.24, 0.2 * slim])] : []),
    ])
  const pelvis = (c: string) => p('bottom', 'hips', 'rbox', c, [0, 0.12, 0], [0.56 * w, 0.22, 0.44])
  switch (a.bottom) {
    case 'shorts_brown':
      return [pelvis('#8a5a3b'), ...legs('#8a5a3b', false)]
    case 'skirt_red':
      return [pelvis('#d9534f'), p('bottom', 'hips', 'flare', '#d9534f', [0, -0.12, 0], [0.74 * w, 0.32, 0.6]), ...legs(shade(a.skin, 0), false, 0.9)]
    case 'leggings_blue':
      return [pelvis('#4f7fc7'), ...legs('#4f7fc7', true, 0.88)]
    default: // trousers_dark
      return [pelvis('#3d3b52'), ...legs('#3d3b52', true)]
  }
}

function shoes(a: Appearance): PartSpec[] {
  const pair = (make: (side: 'l' | 'r') => PartSpec[]) => SIDES.flatMap(make)
  const boot = (c: string) => pair((side) => [p('shoes', `foot.${side}`, 'rbox', c, [0, 0.09, 0.01], [0.24, 0.32, 0.17], FOOT_FLAT), p('shoes', `lowerleg.${side}`, 'cylinder', c, [0, 0.13, 0], [0.22, 0.1, 0.22])])
  switch (a.shoes) {
    case 'sneakers_red':
      return pair((side) => [p('shoes', `foot.${side}`, 'rbox', '#e2574c', [0, 0.09, -0.01], [0.24, 0.32, 0.14], FOOT_FLAT), p('shoes', `foot.${side}`, 'box', '#ffffff', [0, 0.1, 0.06], [0.25, 0.33, 0.04], FOOT_FLAT)])
    case 'sandals':
      return pair((side) => [p('shoes', `foot.${side}`, 'box', '#c0874f', [0, 0.1, 0.06], [0.24, 0.32, 0.04], FOOT_FLAT), p('shoes', `foot.${side}`, 'rbox', a.skin, [0, 0.08, 0], [0.2, 0.26, 0.12], FOOT_FLAT), p('shoes', `foot.${side}`, 'box', '#8a5a3b', [0, 0.09, -0.02], [0.22, 0.05, 0.13], FOOT_FLAT)])
    case 'boots_black':
      return boot('#2e2a3a')
    case 'winged_boots':
      return [...boot('#6cc4f0'), ...pair((side) => [p('shoes', `lowerleg.${side}`, 'cone', '#ffffff', [sx(side) * 0.16, 0.12, -0.02], [0.08, 0.26, 0.16], [0, 0, sx(side) * -1.2])])]
    default: // boots_brown
      return boot('#6b4226')
  }
}

function hair(a: Appearance): PartSpec[] {
  const c = a.hairColour
  const h = (shape: Shape, offset: V3, scale: V3, rotation?: V3) => p('hairStyle', 'head', shape, c, offset, scale, rotation)
  // A shell a little bigger than the head, set back so the face stays clear, plus a fringe over the forehead.
  const shell = (scale: V3 = [1.08, 0.56, 1]) => h('rbox', [0, 0.7, -0.06], scale)
  const cap = [shell(), h('rbox', [0, 0.85, 0.4], [0.98, 0.2, 0.16])]
  switch (a.hairStyle) {
    case 'spiky':
      return [...cap, ...([[-0.32, 0.5], [-0.1, 0.15], [0.14, -0.15], [0.34, -0.5]] as const).map(([x, r]) => h('cone', [x, 1.08, 0.05], [0.24, 0.36, 0.24], [0.2, 0, r]))]
    case 'bob':
      return [...cap, ...SIDES.map((side) => h('rbox', [sx(side) * 0.5, 0.42, 0.02], [0.14, 0.62, 0.86]))]
    case 'long':
      return [...cap, h('rbox', [0, 0.28, -0.42], [1.02, 1, 0.18]), ...SIDES.map((side) => h('rbox', [sx(side) * 0.5, 0.3, 0.08], [0.14, 0.86, 0.6]))]
    case 'ponytail':
      return [...cap, h('capsule', [0, 0.55, -0.6], [0.24, 0.62, 0.24], [0.6, 0, 0]), p('hairStyle', 'head', 'sphere', '#e2574c', [0, 0.78, -0.5], [0.14, 0.14, 0.14])]
    case 'buns':
      return [...cap, ...SIDES.map((side) => h('sphere', [sx(side) * 0.36, 1.02, -0.06], [0.38, 0.38, 0.38]))]
    case 'curly':
      return [shell(), ...[-0.45, -0.3, -0.1, 0.1, 0.3, 0.45].flatMap((x, i) => [h('sphere', [x, 0.9 - Math.abs(x) * 0.4, 0.38], [0.3, 0.3, 0.3]), h('sphere', [x * 0.9, 1.02 - (i % 2) * 0.06, -0.1], [0.34, 0.34, 0.34])])]
    case 'afro':
      return [h('sphere', [0, 0.74, -0.06], [1.46, 1.22, 1.34])]
    case 'braid':
      return [...cap, ...[0.36, 0.18, 0, -0.18].map((y) => h('sphere', [0.52, y, -0.12], [0.2, 0.22, 0.2])), p('hairStyle', 'head', 'sphere', '#e2574c', [0.52, -0.31, -0.12], [0.1, 0.1, 0.1])]
    case 'buzz':
      return [h('rbox', [0, 0.76, -0.04], [1.04, 0.42, 0.96])]
    case 'hijab':
      return [
        h('rbox', [0, 0.68, -0.07], [1.16, 0.66, 1.04]),
        h('rbox', [0, 0.42, -0.26], [1.14, 1.02, 0.5]),
        ...SIDES.map((side) => h('rbox', [sx(side) * 0.54, 0.4, 0.06], [0.1, 0.96, 0.84])),
        h('rbox', [0, 0.88, 0.42], [1.04, 0.16, 0.12]),
        p('hairStyle', 'chest', 'flare', c, [0, 0.02, 0], [0.82, 0.3, 0.62]),
      ]
    default: // short
      return cap
  }
}

function accessory(a: Appearance): PartSpec[] {
  const x = (shape: Shape, colour: string, offset: V3, scale: V3, rotation?: V3) => p('accessory', 'head', shape, colour, offset, scale, rotation)
  switch (a.accessory) {
    case 'flower':
      return [...[0, 72, 144, 216, 288].map((d) => x('sphere', '#f7a8c4', [0.38 + 0.09 * Math.cos((d * PI) / 180), 0.92 + 0.09 * Math.sin((d * PI) / 180), 0.4], [0.13, 0.13, 0.07])), x('sphere', GOLD, [0.38, 0.92, 0.44], [0.09, 0.09, 0.06])]
    case 'glasses':
      return [...SIDES.map((side) => x('ring', INK, [sx(side) * 0.2, 0.5, 0.49], [0.24, 0.24, 0.2])), x('box', INK, [0, 0.52, 0.49], [0.14, 0.025, 0.02])]
    case 'grad_cap':
      return [x('cylinder', INK, [0, 0.98, 0], [0.7, 0.12, 0.7]), x('box', '#3a3550', [0, 1.06, 0], [0.96, 0.05, 0.96], [0, PI / 4, 0]), x('sphere', GOLD, [0.36, 0.9, 0.3], [0.08, 0.08, 0.08])]
    case 'headband':
      return [x('ring', '#e2574c', [0, 0.74, -0.03], [1.2, 1.1, 0.5], [PI / 2, 0, 0])]
    case 'star_clip':
      return [x('octa', GOLD, [-0.36, 0.78, 0.47], [0.18, 0.18, 0.07])]
    case 'leaf_crown':
      return [x('ring', '#5e8c31', [0, 0.92, 0], [1, 0.92, 0.26], [PI / 2, 0, 0]), ...[-0.4, -0.24, -0.08, 0.08, 0.24, 0.4].map((lx) => x('sphere', '#7cc04a', [lx, 1.02, 0.4 - Math.abs(lx) * 0.5], [0.1, 0.2, 0.05], [0, 0, -lx]))]
    case 'wizard_hat':
      return [x('cylinder', '#4a3f9a', [0, 0.96, 0], [1.34, 0.05, 1.3]), x('cone', '#5a4fb5', [0, 1.38, -0.04], [0.8, 0.82, 0.78], [-0.12, 0, 0]), x('ring', GOLD, [0, 1.02, 0], [0.78, 0.76, 0.2], [PI / 2, 0, 0]), x('octa', GOLD, [0, 1.36, 0.36], [0.13, 0.13, 0.05])]
    case 'golden_crown':
      return [x('cylinder', GOLD, [0, 1.02, 0], [0.74, 0.2, 0.72]), ...[-0.24, 0, 0.24].map((cx) => x('cone', GOLD, [cx, 1.2, 0.26], [0.13, 0.2, 0.08])), x('sphere', '#d9534f', [0, 1.02, 0.36], [0.09, 0.09, 0.05]), ...SIDES.map((side) => x('sphere', '#6cc4f0', [sx(side) * 0.2, 1.02, 0.34], [0.07, 0.07, 0.04]))]
    default:
      return []
  }
}

/**
 * Held in the right hand. The hand slot's +y points forward in the idle pose and its −x points up, so blades are
 * tilted 45° up from forward; the staff stands upright and the bow is held vertically by its middle.
 */
function weapon(a: Appearance): PartSpec[] {
  const turn: V3 = [0, PI, -PI / 4]
  const upright: V3 = [0, PI, -PI / 2]
  // Offsets and shapes are given in the weapon's own frame, then the whole weapon is turned by `frame` as one piece.
  const w = (shape: Shape, colour: string, offset: V3, scale: V3, frame: V3 = turn, own: V3 = [0, 0, 0]) => {
    const q = new Quaternion().setFromEuler(new Euler(...frame))
    const at = new Vector3(...offset).applyQuaternion(q)
    const rot = new Euler().setFromQuaternion(q.multiply(new Quaternion().setFromEuler(new Euler(...own))))
    const r3 = (n: number) => Math.round(n * 1000) / 1000
    return p('weapon', 'handslot.r', shape, colour, [r3(at.x), r3(at.y), r3(at.z)], scale, [r3(rot.x), r3(rot.y), r3(rot.z)])
  }
  switch (a.weapon) {
    case 'short_bow':
      return [w('arc', '#a0612f', [0, -0.35, 0], [0.8, 0.8, 0.5], [0, 0, 0]), w('cylinder', '#f4f1ea', [0, -0.35, 0], [0.015, 0.7, 0.015], [0, 0, 0], [0, 0, PI / 2])]
    case 'apprentice_staff':
      return [w('cylinder', '#8a5a3b', [0, 0.3, 0], [0.07, 1.3, 0.07], upright), w('sphere', '#6cc4f0', [0, 0.98, 0], [0.2, 0.2, 0.2], upright)]
    case 'quill':
      return [w('cone', '#f4f1ea', [0, 0.34, 0], [0.14, 0.6, 0.04]), w('cylinder', INK, [0, 0.02, 0], [0.03, 0.1, 0.03])]
    case 'golden_quill':
      return [w('cone', GOLD, [0, 0.38, 0], [0.16, 0.68, 0.05]), w('cylinder', INK, [0, 0.02, 0], [0.03, 0.1, 0.03]), w('octa', '#fff6e3', [0.12, 0.6, 0], [0.07, 0.07, 0.07]), w('octa', '#fff6e3', [-0.1, 0.36, 0], [0.05, 0.05, 0.05])]
    case 'crystal_wand':
      return [w('cylinder', '#f4f1ea', [0, 0.22, 0], [0.05, 0.42, 0.05]), w('octa', '#e88fb4', [0, 0.52, 0], [0.16, 0.26, 0.16])]
    case 'steel_sword':
      return [w('box', '#d7dde6', [0, 0.5, 0], [0.11, 0.74, 0.035]), w('cone', '#d7dde6', [0, 0.93, 0], [0.11, 0.12, 0.035]), w('rbox', GOLD, [0, 0.11, 0], [0.32, 0.06, 0.08]), w('cylinder', '#3d5a80', [0, 0, 0], [0.06, 0.18, 0.06]), w('sphere', GOLD, [0, -0.1, 0], [0.08, 0.08, 0.08])]
    default: // wooden_sword
      return [w('box', '#d9b38c', [0, 0.42, 0], [0.1, 0.6, 0.04]), w('cone', '#d9b38c', [0, 0.76, 0], [0.1, 0.1, 0.04]), w('box', '#8a5a3b', [0, 0.1, 0], [0.28, 0.05, 0.07]), w('cylinder', '#6b4226', [0, 0, 0], [0.06, 0.18, 0.06])]
  }
}

/** Worn on the back of the chest (−z); the owl peeks over the left shoulder (+x). */
function backpack(a: Appearance): PartSpec[] {
  const b = (shape: Shape, colour: string, offset: V3, scale: V3, rotation?: V3) => p('backpack', 'chest', shape, colour, offset, scale, rotation)
  switch (a.backpack) {
    case 'satchel':
      return [b('rbox', '#a0612f', [0.36, -0.42, 0.02], [0.12, 0.26, 0.32]), b('box', '#8a4f24', [0.42, -0.34, 0.02], [0.03, 0.12, 0.33]), b('box', '#8a4f24', [0.05, 0.02, 0], [0.04, 0.9, 0.52], [0, 0, 0.75])]
    case 'explorer':
      return [b('rbox', '#8a5a3b', [0, -0.05, -0.34], [0.5, 0.56, 0.22]), b('cylinder', '#5e8c31', [0, 0.27, -0.34], [0.18, 0.6, 0.18], [0, 0, PI / 2]), b('rbox', '#a87048', [0, -0.12, -0.46], [0.26, 0.2, 0.06])]
    case 'book_bag':
      return [b('rbox', '#4f7fc7', [0, -0.06, -0.33], [0.46, 0.5, 0.2]), b('box', '#d9534f', [-0.1, 0.24, -0.33], [0.08, 0.2, 0.16]), b('box', GOLD, [0.06, 0.27, -0.33], [0.1, 0.26, 0.16])]
    case 'scroll_case':
      return [b('cylinder', '#c0874f', [0, -0.05, -0.3], [0.15, 1, 0.15], [0, 0, 0.6]), b('cylinder', '#8a5a3b', [-0.27, 0.34, -0.3], [0.17, 0.1, 0.17], [0, 0, 0.6])]
    case 'owl_pack':
      return [
        b('sphere', '#a87048', [0.3, 0.12, -0.3], [0.4, 0.5, 0.34]),
        b('sphere', '#e8c9a0', [0.3, 0.06, -0.15], [0.24, 0.28, 0.1]),
        ...[-0.08, 0.08].flatMap((d) => [b('sphere', '#ffffff', [0.3 + d, 0.28, -0.15], [0.11, 0.11, 0.06]), b('sphere', INK, [0.3 + d, 0.28, -0.12], [0.05, 0.05, 0.03])]),
        b('cone', GOLD, [0.3, 0.2, -0.13], [0.05, 0.07, 0.04], [PI, 0, 0]),
        ...[-0.11, 0.11].map((d) => b('cone', '#8a5a3b', [0.3 + d, 0.4, -0.3], [0.08, 0.14, 0.08])),
      ]
    default:
      return []
  }
}

export function heroParts(input: Appearance): PartSpec[] {
  const a = sanitizeAppearance(input)
  const w = BODY_WIDTH[a.body as keyof typeof BODY_WIDTH] ?? 1
  const bareShins = a.bottom === 'shorts_brown' || a.bottom === 'skirt_red'
  return [...skin(a, w, LONG_SLEEVES.has(a.top), bareShins), ...face(a), ...top(a, w), ...bottom(a, w), ...shoes(a), ...hair(a), ...accessory(a), ...weapon(a), ...backpack(a)]
}

export const BONES: BoneName[] = ['hips', 'spine', 'chest', 'head', 'upperarm.l', 'upperarm.r', 'lowerarm.l', 'lowerarm.r', 'hand.l', 'hand.r', 'handslot.l', 'handslot.r', 'upperleg.l', 'upperleg.r', 'lowerleg.l', 'lowerleg.r', 'foot.l', 'foot.r']
