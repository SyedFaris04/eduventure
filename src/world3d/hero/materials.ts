import { BoxGeometry, BufferGeometry, CanvasTexture, CapsuleGeometry, ConeGeometry, CylinderGeometry, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, PlaneGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Shape } from './parts'
import { drawEyes, drawMouth } from './faceTexture'

// Everything here is shared by every hero on screen and lives for the whole visit, so swapping an option
// in the creator never allocates new GPU memory beyond the first time a colour or shape is seen.

const materials = new Map<string, MeshStandardMaterial>()
export function material(colour: string): MeshStandardMaterial {
  let m = materials.get(colour)
  if (!m) materials.set(colour, (m = new MeshStandardMaterial({ color: colour, roughness: 0.82, metalness: 0 })))
  return m
}

type Solid = Exclude<Shape, `eyes:${string}` | `mouth:${string}`>
const makers: Record<Solid, () => BufferGeometry> = {
  rbox: () => new RoundedBoxGeometry(1, 1, 1, 3, 0.28),
  box: () => new BoxGeometry(1, 1, 1),
  sphere: () => new SphereGeometry(0.5, 18, 12),
  dome: () => new SphereGeometry(0.5, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 2, 1), // base on y = 0, top at 1
  capsule: () => new CapsuleGeometry(0.5, 1, 4, 12).scale(1, 0.5, 1),
  cone: () => new ConeGeometry(0.5, 1, 14),
  cylinder: () => new CylinderGeometry(0.5, 0.5, 1, 16),
  hex: () => new CylinderGeometry(0.5, 0.5, 1, 6),
  flare: () => new CylinderGeometry(0.3, 0.5, 1, 16),
  ring: () => new TorusGeometry(0.44, 0.06, 8, 28),
  arc: () => new TorusGeometry(0.44, 0.06, 6, 18, Math.PI),
  octa: () => new OctahedronGeometry(0.5),
}
const geometries = new Map<string, BufferGeometry>()
export function geometry(shape: Shape): BufferGeometry {
  const kind: Solid = shape.startsWith('eyes:') || shape.startsWith('mouth:') ? 'box' : (shape as Solid)
  const key = kind === 'box' && shape !== 'box' ? 'plane' : kind
  let g = geometries.get(key)
  if (!g) geometries.set(key, (g = key === 'plane' ? new PlaneGeometry(1, 1) : makers[kind]()))
  return g
}

const faces = new Map<string, MeshBasicMaterial>()
/** Eyes and mouths are drawn once per style into a canvas and shared; without a 2D canvas (tests) they stay blank. */
export function faceMaterial(shape: `eyes:${string}` | `mouth:${string}`): MeshBasicMaterial {
  let m = faces.get(shape)
  if (!m) {
    const [kind, style] = shape.split(':') as ['eyes' | 'mouth', string]
    const canvas = kind === 'eyes' ? drawEyes(style) : drawMouth(style)
    const map = canvas ? new CanvasTexture(canvas) : null
    if (map) map.colorSpace = SRGBColorSpace
    faces.set(shape, (m = new MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: map ? 1 : 0 })))
  }
  return m
}
