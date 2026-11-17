import { Group, Mesh, MeshStandardMaterial } from 'three'
import type { BossId, MonsterKind } from '../../game/map'
import { faceMaterial, geometry, material } from '../hero/materials'
import type { Shape } from '../hero/parts'

export const MONSTER_KINDS: MonsterKind[] = ['sproutling', 'pebblewing', 'dinobud', 'hornbill', 'tapir', 'pangolin', 'cubelet', 'hexowl', 'pisnake', 'bugsy', 'bytebot', 'loopy', 'wordworm', 'alphabat', 'commaleon']
export const BOSS_IDS: BossId[] = ['guardian', 'raja_rafflesia', 'abacus_titan', 'glitch_golem', 'lexicon_dragon']
type V3 = [number, number, number]
type Part = [shape: Shape, colour: string, at: V3, size: V3, rot?: V3]

const PI = Math.PI
const eyes = (y: number, z: number, w = 0.5): Part => ['eyes:round', '', [0, y, z], [w, w * 0.42, 1]]
const mouth = (y: number, z: number, w = 0.26): Part => ['mouth:smile', '', [0, y, z], [w, w * 0.5, 1]]

/** Original monsters in the chunky KayKit style, one world unit ≈ one tile. Feet on y = 0, facing +z. A colour starting with * glows. */
const DESIGNS: Record<MonsterKind | BossId, Part[]> = {
  // A leafy slime with a sprout on its head.
  sproutling: [
    ['sphere', '#9ccc65', [0, 0.32, 0], [0.82, 0.66, 0.78]],
    ['sphere', '#c5e1a5', [-0.16, 0.42, 0.22], [0.2, 0.26, 0.12]],
    ['cylinder', '#5e8c31', [0, 0.72, 0], [0.04, 0.16, 0.04]],
    ['sphere', '#5e9c35', [-0.13, 0.82, 0], [0.26, 0.08, 0.14], [0, 0, 0.5]],
    ['sphere', '#6fae4a', [0.13, 0.84, 0], [0.26, 0.08, 0.14], [0, 0, -0.5]],
    eyes(0.4, 0.385),
    mouth(0.24, 0.37),
  ],
  // A round pebble bird with stubby wings.
  pebblewing: [
    ['sphere', '#a3b1c2', [0, 0.46, 0], [0.76, 0.7, 0.7]],
    ['sphere', '#d7dee6', [0, 0.38, 0.17], [0.46, 0.42, 0.4]],
    ...([1, -1] as const).map((s): Part => ['sphere', '#8796a8', [s * 0.4, 0.5, -0.02], [0.14, 0.34, 0.3], [0, 0, s * 0.5]]),
    ['cone', '#f2994a', [0, 0.46, 0.38], [0.12, 0.14, 0.12], [PI / 2, 0, 0]],
    ...([1, -1] as const).map((s): Part => ['cylinder', '#f2994a', [s * 0.14, 0.06, 0.04], [0.05, 0.14, 0.05]]),
    ...([[-0.22, 0.7, 0.1], [0.2, 0.75, 0], [0.3, 0.5, -0.2]] as V3[]).map((at): Part => ['sphere', '#8796a8', at, [0.07, 0.07, 0.07]]),
    eyes(0.58, 0.33, 0.44),
  ],
  // A chubby baby dinosaur with a cream belly and soft back spikes.
  dinobud: [
    ['sphere', '#d9894a', [0, 0.36, -0.04], [0.68, 0.62, 0.72]],
    ['sphere', '#fff6e3', [0, 0.32, 0.18], [0.42, 0.42, 0.32]],
    ['sphere', '#d9894a', [0, 0.78, 0.12], [0.62, 0.52, 0.58]],
    ['cone', '#d9894a', [0, 0.22, -0.48], [0.24, 0.42, 0.18], [-PI / 2 - 0.3, 0, 0]],
    ...([0.98, 0.72, 0.46] as const).map((y, i): Part => ['cone', '#e2574c', [0, y + 0.08, -0.22 - i * 0.06], [0.12, 0.18, 0.12], [-0.4 - i * 0.3, 0, 0]]),
    ...([1, -1] as const).map((s): Part => ['capsule', '#d9894a', [s * 0.18, 0.08, 0.02], [0.16, 0.18, 0.18]]),
    eyes(0.84, 0.42, 0.42),
    mouth(0.68, 0.41),
  ],
  // Science Island — Kenyalang: a rhinoceros-hornbill chick with a big orange casque and a white tail band.
  hornbill: [
    ['sphere', '#2b2b2b', [0, 0.46, 0], [0.62, 0.6, 0.7]],
    ['sphere', '#f4f1ea', [0, 0.4, 0.17], [0.42, 0.4, 0.34]],
    ['box', '#2b2b2b', [0, 0.42, -0.42], [0.36, 0.08, 0.4], [0.4, 0, 0]],
    ['box', '#f4f1ea', [0, 0.38, -0.52], [0.37, 0.09, 0.12], [0.4, 0, 0]],
    ['sphere', '#2b2b2b', [0, 0.84, 0.14], [0.42, 0.42, 0.42]],
    ['cone', '#f2c14e', [0, 0.8, 0.5], [0.17, 0.42, 0.17], [PI / 2, 0, 0]],
    ['capsule', '#e8743a', [0, 0.98, 0.34], [0.14, 0.3, 0.16], [PI / 2, 0, 0]],
    ...([1, -1] as const).map((s): Part => ['sphere', '#3a3a3a', [s * 0.33, 0.5, -0.04], [0.14, 0.34, 0.44], [0, 0, s * 0.4]]),
    ...([1, -1] as const).map((s): Part => ['cylinder', '#f2c14e', [s * 0.12, 0.07, 0.02], [0.05, 0.14, 0.05]]),
    eyes(0.9, 0.345, 0.34),
  ],
  // Science Island — a tapir calf: round and brown with cream stripes and a short trunk.
  tapir: [
    ['sphere', '#6b4a3a', [0, 0.42, 0], [0.62, 0.56, 0.86]],
    ...([-0.22, 0, 0.2] as const).map((z): Part => ['sphere', '#f1e2c4', [0, 0.42, z], [0.64, 0.58, 0.07]]),
    ['sphere', '#6b4a3a', [0, 0.58, 0.42], [0.44, 0.42, 0.44]],
    ['cylinder', '#5a3d30', [0, 0.52, 0.66], [0.17, 0.16, 0.17], [PI / 2, 0, 0]],
    ...([1, -1] as const).map((s): Part => ['sphere', '#5a3d30', [s * 0.15, 0.8, 0.36], [0.1, 0.14, 0.06]]),
    ...([[0.18, 0.22], [-0.18, 0.22], [0.18, -0.22], [-0.18, -0.22]] as const).map(([x, z]): Part => ['cylinder', '#5a3d30', [x, 0.1, z], [0.12, 0.2, 0.12]]),
    eyes(0.66, 0.635, 0.32),
  ],
  // Science Island — Tenggiling: a pangolin in overlapping scale plates.
  pangolin: [
    ['sphere', '#a9804f', [0, 0.32, 0], [0.6, 0.52, 0.82]],
    ...([0, 1, 2, 3] as const).map((i): Part => ['dome', '#8a6238', [0, 0.36 + (i === 1 || i === 2 ? 0.06 : 0), -0.3 + i * 0.2], [0.64 - Math.abs(i - 1.5) * 0.08, 0.26, 0.28], [-0.25 + i * 0.15, 0, 0]]),
    ['cone', '#c99a66', [0, 0.3, 0.5], [0.26, 0.36, 0.26], [PI / 2, 0, 0]],
    ['cone', '#8a6238', [0, 0.16, -0.5], [0.24, 0.46, 0.2], [-PI / 2 - 0.2, 0, 0]],
    ...([[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]] as const).map(([x, z]): Part => ['sphere', '#6b4a2e', [x, 0.05, z], [0.12, 0.1, 0.14]]),
    eyes(0.38, 0.56, 0.26),
  ],
  // Mathematics Mountains — Cubelet: a friendly die with little feet.
  cubelet: [
    ['rbox', '#fff6e3', [0, 0.44, 0], [0.62, 0.62, 0.62]],
    ...([[-0.15, -0.15], [0, 0], [0.15, 0.15]] as const).map(([x, z]): Part => ['sphere', '#2b2b2b', [x, 0.755, z], [0.08, 0.03, 0.08]]),
    ...([1, -1] as const).flatMap((s): Part[] => [['sphere', '#e2574c', [s * 0.312, 0.56, 0.12], [0.03, 0.08, 0.08]], ['sphere', '#e2574c', [s * 0.312, 0.32, -0.12], [0.03, 0.08, 0.08]]]),
    ...([1, -1] as const).map((s): Part => ['capsule', '#f2c14e', [s * 0.16, 0.07, 0.05], [0.13, 0.12, 0.16]]),
    eyes(0.52, 0.315, 0.4),
    mouth(0.34, 0.315, 0.2),
  ],
  // Mathematics Mountains — Hexowl: a hexagonal owl in spectacles.
  hexowl: [
    ['hex', '#7e6bb3', [0, 0.46, 0], [0.64, 0.68, 0.64]],
    ['hex', '#cfc3ec', [0, 0.4, 0.29], [0.4, 0.05, 0.46], [PI / 2, 0, 0]],
    ...([1, -1] as const).map((s): Part => ['cone', '#5c4a8f', [s * 0.2, 0.88, 0], [0.1, 0.22, 0.1], [0, 0, -s * 0.3]]),
    ...([1, -1] as const).map((s): Part => ['ring', '#2b2b2b', [s * 0.13, 0.64, 0.335], [0.26, 0.26, 0.26]]),
    ['cone', '#f2c14e', [0, 0.54, 0.34], [0.08, 0.12, 0.08], [PI, 0, 0]],
    ...([1, -1] as const).map((s): Part => ['hex', '#5c4a8f', [s * 0.35, 0.44, 0], [0.16, 0.38, 0.3], [0, 0, s * 0.2]]),
    ...([1, -1] as const).map((s): Part => ['sphere', '#f2c14e', [s * 0.12, 0.06, 0.12], [0.12, 0.08, 0.14]]),
    eyes(0.64, 0.325, 0.42),
  ],
  // Mathematics Mountains — Pi-thon: a snake curled into the shape of π.
  pisnake: [
    ['capsule', '#6fbf5f', [0, 0.82, 0], [0.2, 0.9, 0.2], [0, 0, PI / 2]],
    ...([1, -1] as const).map((s): Part => ['capsule', '#6fbf5f', [s * 0.22, 0.38, 0], [0.2, 0.7, 0.2]]),
    ['sphere', '#5aa34c', [-0.32, 0.06, 0.04], [0.2, 0.12, 0.2]],
    ['sphere', '#6fbf5f', [0.52, 0.86, 0.04], [0.34, 0.3, 0.34]],
    ...([-0.2, 0.05, 0.25] as const).map((x): Part => ['sphere', '#f2c14e', [x, 0.86, 0.09], [0.07, 0.07, 0.04]]),
    ['box', '#e2574c', [0.52, 0.76, 0.22], [0.04, 0.02, 0.12]],
    ['eyes:round', '', [0.52, 0.9, 0.215], [0.26, 0.11, 1]],
  ],
  // Technology City — Bugsy: a beetle whose antennae end in blinking cursors.
  bugsy: [
    ['sphere', '#3fae7a', [0, 0.34, -0.04], [0.8, 0.56, 0.9]],
    ['box', '#2b7a56', [0, 0.6, -0.04], [0.03, 0.08, 0.86]],
    ['sphere', '#2b3142', [0, 0.36, 0.42], [0.46, 0.42, 0.4]],
    ...([1, -1] as const).map((s): Part => ['cylinder', '#2b3142', [s * 0.12, 0.66, 0.5], [0.03, 0.34, 0.03], [0.4, 0, -s * 0.3]]),
    ...([1, -1] as const).map((s): Part => ['box', '*#ffcf4d', [s * 0.18, 0.82, 0.58], [0.04, 0.12, 0.04]]),
    ...([-0.22, 0, 0.22] as const).flatMap((z): Part[] => ([1, -1] as const).map((s): Part => ['capsule', '#2b3142', [s * 0.4, 0.1, z], [0.06, 0.16, 0.06], [0, 0, s * 0.8]])),
    eyes(0.42, 0.625, 0.3),
  ],
  // Technology City — Byte-bot: a small boxy robot on wheels with a screen face.
  bytebot: [
    ...([1, -1] as const).map((s): Part => ['cylinder', '#2b3142', [s * 0.27, 0.13, 0], [0.26, 0.09, 0.26], [0, 0, PI / 2]]),
    ['rbox', '#c9d2e3', [0, 0.48, 0], [0.62, 0.5, 0.5]],
    ['box', '*#46e0c9', [0, 0.5, 0.26], [0.3, 0.12, 0.02]],
    ['rbox', '#e8ecf5', [0, 0.95, 0], [0.54, 0.42, 0.46]],
    ['box', '#2b3142', [0, 0.95, 0.225], [0.42, 0.28, 0.02]],
    ['cylinder', '#8a8f99', [0, 1.22, 0], [0.04, 0.16, 0.04]],
    ['sphere', '*#ff5ea8', [0, 1.32, 0], [0.1, 0.1, 0.1]],
    eyes(0.97, 0.24, 0.32),
  ],
  // Technology City — Loopy: a loop of orange cable with a plug for a head.
  loopy: [
    ['ring', '#ff8a3d', [0, 0.46, 0], [0.92, 0.92, 2.2]],
    ['rbox', '#2b3142', [0.36, 0.86, 0.06], [0.3, 0.26, 0.32]],
    ...([1, -1] as const).map((s): Part => ['box', '*#ffcf4d', [0.53, 0.86 + s * 0.06, 0.06], [0.08, 0.03, 0.03]]),
    ['eyes:round', '', [0.36, 0.88, 0.225], [0.24, 0.1, 1]],
  ],
  // Language Kingdom — Wordworm: a bookworm in glasses, sitting on its favourite book.
  wordworm: [
    ['box', '#e85a4f', [0, 0.06, 0], [0.6, 0.12, 0.46]],
    ['box', '#f4ecd8', [0, 0.13, 0.02], [0.54, 0.03, 0.42]],
    ...([[-0.32, 0.26], [-0.12, 0.3], [0.1, 0.34]] as const).map(([z, s]): Part => ['sphere', '#8bc34a', [0, 0.14 + s / 2, z], [s, s, s]]),
    ['sphere', '#9ccc65', [0, 0.55, 0.3], [0.42, 0.42, 0.4]],
    ...([1, -1] as const).map((s): Part => ['ring', '#2b2b2b', [s * 0.1, 0.6, 0.49], [0.2, 0.2, 0.2]]),
    eyes(0.6, 0.495, 0.32),
    mouth(0.45, 0.49, 0.16),
  ],
  // Language Kingdom — Alpha-bat: a purple bat whose wings are covered in letters.
  alphabat: [
    ...([1, -1] as const).map((s): Part => ['cylinder', '#2b2b2b', [s * 0.08, 0.22, 0], [0.04, 0.44, 0.04]]),
    ['sphere', '#5c4a8f', [0, 0.7, 0], [0.52, 0.52, 0.46]],
    ...([1, -1] as const).map((s): Part => ['octa', '#7e6bb3', [s * 0.48, 0.76, -0.02], [0.62, 0.36, 0.05], [0, 0, s * 0.3]]),
    ...([1, -1] as const).flatMap((s): Part[] => [['box', '#f2c14e', [s * 0.42, 0.8, 0.02], [0.08, 0.12, 0.02]], ['box', '#f2c14e', [s * 0.6, 0.72, 0.02], [0.06, 0.1, 0.02]]]),
    ...([1, -1] as const).map((s): Part => ['cone', '#5c4a8f', [s * 0.14, 1.0, 0], [0.12, 0.2, 0.12]]),
    eyes(0.74, 0.23, 0.32),
    mouth(0.6, 0.22, 0.14),
  ],
  // Language Kingdom — Comma-leon: a chameleon whose curled tail is a comma.
  commaleon: [
    ['sphere', '#4fb38a', [0, 0.38, -0.02], [0.5, 0.44, 0.8]],
    ['sphere', '#5cc79a', [0, 0.5, 0.42], [0.42, 0.38, 0.42]],
    ['ring', '#3f9a75', [0, 0.32, -0.5], [0.4, 0.4, 1.4], [0, PI / 2, 0]],
    ...([-0.1, 0.12, 0.32] as const).map((z): Part => ['cone', '#3f9a75', [0, 0.62, z - 0.1], [0.08, 0.14, 0.08]]),
    ...([[0.18, 0.2], [-0.18, 0.2], [0.18, -0.22], [-0.18, -0.22]] as const).map(([x, z]): Part => ['capsule', '#3f9a75', [x, 0.08, z], [0.1, 0.16, 0.1]]),
    eyes(0.56, 0.62, 0.34),
    mouth(0.44, 0.61, 0.14),
  ],
  // The Greenhaven Guardian: a gentle, mossy stone golem with a glowing rune.
  guardian: [
    ['rbox', '#b6bec8', [0, 1.15, 0], [1.5, 1.5, 1.1]],
    ['dome', '#7cb342', [0, 1.62, 0], [1.56, 0.36, 1.16]],
    ...([-0.4, 0, 0.4] as const).map((x, i): Part => ['cone', '#5e9c35', [x, 2.02 + (i === 1 ? 0.08 : 0), 0], [0.18, 0.3, 0.18], [0, 0, -x * 0.6]]),
    ...([1, -1] as const).map((s): Part => ['rbox', '#a3acb6', [s * 0.95, 1.0, 0.05], [0.42, 0.9, 0.5], [0, 0, s * 0.12]]),
    ...([1, -1] as const).map((s): Part => ['rbox', '#8f98a3', [s * 0.36, 0.22, 0], [0.42, 0.46, 0.5]]),
    ['octa', '#6cc4f0', [0, 0.95, 0.56], [0.3, 0.36, 0.1]],
    ...([[-0.4, 0.62, 0.56], [0.45, 0.7, 0.56]] as V3[]).map((at): Part => ['sphere', '#8f98a3', at, [0.1, 0.1, 0.05]]),
    eyes(1.42, 0.555, 0.62),
    mouth(1.22, 0.555, 0.3),
  ],
  // Science Island boss — Raja Rafflesia: a giant red bloom with white spots and a glowing heart.
  raja_rafflesia: [
    ...([0, 1, 2] as const).map((i): Part => ['dome', '#3d7a3a', [Math.cos(i * 2.1) * 0.55, 0, Math.sin(i * 2.1) * 0.55], [0.9, 0.24, 0.5], [0, -i * 2.1, 0]]),
    ['cylinder', '#4b8c40', [0, 0.65, 0], [0.34, 1.3, 0.34]],
    ...([0, 1, 2, 3, 4] as const).map((i): Part => ['rbox', '#c0392b', [Math.cos((i * 2 * PI) / 5 + PI / 2) * 0.62, 1.32, Math.sin((i * 2 * PI) / 5 + PI / 2) * 0.62], [0.9, 0.14, 0.72], [0, -((i * 2 * PI) / 5 + PI / 2), -0.12]]),
    ...([0, 1, 2, 3, 4] as const).map((i): Part => ['sphere', '#f4f1ea', [Math.cos((i * 2 * PI) / 5 + PI / 2 + 0.2) * 0.72, 1.4, Math.sin((i * 2 * PI) / 5 + PI / 2 + 0.2) * 0.72], [0.14, 0.04, 0.14]]),
    ['cylinder', '#7a1f1a', [0, 1.5, 0], [0.82, 0.36, 0.82]],
    ['sphere', '*#ffcf4d', [0, 1.7, 0], [0.48, 0.26, 0.48]],
    ...([0, 1, 2, 3, 4, 5] as const).map((i): Part => ['cone', '#ffcf4d', [Math.cos(i * 1.05) * 0.14, 1.9, Math.sin(i * 1.05) * 0.14], [0.07, 0.36, 0.07]]),
    ...([1, -1] as const).map((s): Part => ['box', '#3d7a3a', [s * 1.0, 1.05, 0.1], [0.9, 0.06, 0.32], [0, 0, s * 0.5]]),
    eyes(1.5, 0.415, 0.5),
    mouth(1.38, 0.415, 0.24),
  ],
  // Technology City boss — the Glitch Golem: a giant of purple pixel blocks with flickering glowing pixels.
  glitch_golem: [
    ...([1, -1] as const).map((s): Part => ['box', '#4f4594', [s * 0.33, 0.3, 0], [0.45, 0.6, 0.5]]),
    ['box', '#6b5fa8', [0, 1.2, 0], [1.3, 1.2, 0.9]],
    ['box', '#8a7fd0', [0, 2.15, 0.02], [0.8, 0.7, 0.7]],
    ...([1, -1] as const).map((s): Part => ['box', '#5a4fa0', [s * 0.92, 1.15, 0.04], [0.4, 1.0, 0.45], [0, 0, s * 0.08]]),
    ...([[-0.4, 1.5], [-0.1, 1.2], [0.25, 1.45], [0.4, 0.95], [-0.3, 0.85], [0.05, 0.75]] as const).map(([x, y], i): Part => ['box', i % 2 ? '*#46e0c9' : '*#ff4fd8', [x, y, 0.46], [0.16, 0.16, 0.03]]),
    ['box', '*#ffcf4d', [0.3, 2.45, 0.37], [0.12, 0.12, 0.02]],
    eyes(2.2, 0.375, 0.5),
    mouth(2.0, 0.375, 0.24),
  ],
  // Language Kingdom boss — the Lexicon Dragon: a blue dragon whose wings are the pages of an open book.
  lexicon_dragon: [
    ...([1, -1] as const).map((s): Part => ['box', '#2f4a85', [s * 0.4, 0.3, 0.1], [0.4, 0.6, 0.5]]),
    ['sphere', '#3f5fa8', [0, 1.0, 0], [1.3, 1.1, 1.5]],
    ['sphere', '#4f6fbd', [0, 1.85, 0.55], [0.8, 0.72, 0.8]],
    ['box', '#4f6fbd', [0, 1.72, 1.0], [0.5, 0.3, 0.36]],
    ...([1, -1] as const).map((s): Part => ['cone', '#f2c14e', [s * 0.24, 2.3, 0.45], [0.12, 0.34, 0.12], [-0.3, 0, -s * 0.3]]),
    ...([1, -1] as const).flatMap((s): Part[] => [['box', '#e85a4f', [s * 0.85, 1.55, -0.15], [0.95, 0.05, 0.75], [0, 0, s * 0.5]], ['box', '#f4ecd8', [s * 0.82, 1.6, -0.15], [0.88, 0.05, 0.68], [0, 0, s * 0.5]]]),
    ['cone', '#3f5fa8', [0, 0.75, -0.95], [0.32, 0.8, 0.32], [-PI / 2 - 0.3, 0, 0]],
    ['octa', '*#ffcf4d', [0, 1.1, 0.74], [0.24, 0.3, 0.06]],
    eyes(1.92, 0.955, 0.5),
    mouth(1.66, 1.185, 0.24),
  ],
  // Mathematics Mountains boss — the Abacus Titan: a stone golem with an abacus in its chest and rune eyes.
  abacus_titan: [
    ...([1, -1] as const).map((s): Part => ['rbox', '#8f897d', [s * 0.36, 0.32, 0], [0.44, 0.64, 0.52]]),
    ['rbox', '#9a9488', [0, 1.25, 0], [1.4, 1.3, 0.9]],
    ['rbox', '#a9a397', [0, 2.2, 0.02], [0.8, 0.62, 0.72]],
    ...([1, -1] as const).map((s): Part => ['rbox', '#8f897d', [s * 0.96, 1.2, 0.04], [0.4, 1.0, 0.48], [0, 0, s * 0.1]]),
    ['box', '#6b4a2e', [0, 1.3, 0.455], [1.0, 0.74, 0.06]],
    ...([1.12, 1.3, 1.48] as const).flatMap((y, r): Part[] => [
      ['cylinder', '#3b2a1c', [0, y, 0.5], [0.03, 0.88, 0.03], [0, 0, PI / 2]],
      ...([0, 1, 2, 3] as const).map((i): Part => ['sphere', ['#e85a4f', '#f2c14e', '#4fa3d9', '#6fbf5f'][(i + r) % 4], [-0.3 + i * 0.2 + (r % 2) * 0.08, y, 0.5], [0.14, 0.12, 0.14]]),
    ]),
    ['octa', '*#6cc4f0', [0, 2.42, 0.38], [0.16, 0.2, 0.06]],
    eyes(2.2, 0.385, 0.5),
    mouth(2.02, 0.385, 0.24),
  ],
}

const rune = new MeshStandardMaterial({ color: '#6cc4f0', emissive: '#3aa8e8', emissiveIntensity: 0.8, roughness: 0.4 })
const glows = new Map<string, MeshStandardMaterial>()
const glow = (c: string) => {
  let m = glows.get(c)
  if (!m) glows.set(c, (m = new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.85, roughness: 0.4 })))
  return m
}

export function buildMonster(kind: MonsterKind | BossId): Group {
  const g = new Group()
  for (const [shape, colour, at, size, rot] of DESIGNS[kind]) {
    const face = shape.startsWith('eyes:') || shape.startsWith('mouth:')
    const m = new Mesh(geometry(shape), face ? faceMaterial(shape as `eyes:${string}`) : kind === 'guardian' && shape === 'octa' ? rune : colour.startsWith('*') ? glow(colour.slice(1)) : material(colour))
    m.position.set(...at)
    m.scale.set(...size)
    if (rot) m.rotation.set(...rot)
    m.castShadow = !face
    g.add(m)
  }
  return g
}
