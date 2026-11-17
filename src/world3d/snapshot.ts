import { AnimationMixer, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer, type Object3D, type AnimationClip } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { buildHero } from './hero/buildHero'
import { RIG_URL } from './hero/useRig'
import { buildMonster } from './monsters/buildMonster'
import { buildPet } from './pet/buildPet'
import { aspect, snapshotKey, type Subject } from './snapshotKey'

/**
 * Still pictures of the 3D hero and monsters for the HUD, Home, Shop, dialogue and battle panels.
 * One hidden renderer draws them one at a time; results are cached, so each look is drawn once per visit.
 */
let renderer: WebGLRenderer | null = null
let rig: Promise<{ scene: Object3D; clips: AnimationClip[] }> | null = null
const cache = new Map<string, Promise<string>>()
const MAX = 200
let queue: Promise<unknown> = Promise.resolve()

const loadRig = () =>
  (rig ??= new GLTFLoader().loadAsync(RIG_URL).then((g) => ({ scene: g.scene, clips: g.animations })))

async function model(s: Subject): Promise<Object3D> {
  if (s.kind === 'pet') return buildPet(s.pet.species, s.pet.stage, s.pet.form, s.pet.look)
  if (s.kind !== 'hero') return buildMonster(s.kind === 'boss' ? s.boss : s.monster)
  const { scene, clips } = await loadRig()
  const body = scene.clone(true)
  buildHero(s.appearance, body)
  // The rest pose is a T-pose: settle into the idle stance first.
  const mixer = new AnimationMixer(body)
  mixer.clipAction(clips.find((c) => c.name === 'Idle')!).play()
  mixer.update(0.6)
  return body
}

async function draw(s: Subject, px: number): Promise<string> {
  const w = px
  const h = Math.round(px * aspect(s))
  renderer ??= new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setSize(w, h, false)
  const scene = new Scene()
  scene.add(new HemisphereLight('#e8f5ff', '#9ccc65', 1.5))
  const sun = new DirectionalLight('#fff1d6', 2.3)
  sun.position.set(3, 6, 5)
  scene.add(sun)
  const subject = await model(s)
  scene.add(subject)
  // Three-quarter front view, framed per kind (hero ~2.3 tall, monsters ~1, the guardian ~2.2).
  const frame = s.kind === 'hero' ? { y: 1.15, d: 7.4 } : s.kind === 'boss' ? { y: 1.1, d: 6.6 } : { y: 0.45, d: 2.7 }
  const cam = new PerspectiveCamera(30, w / h, 0.1, 50)
  cam.position.set(frame.d * 0.36, frame.y + frame.d * 0.16, frame.d * 0.92)
  cam.lookAt(0, frame.y, 0)
  renderer.render(scene, cam)
  return renderer.domElement.toDataURL('image/png')
}

export function snapshot(s: Subject, px: number): Promise<string> {
  const key = `${snapshotKey(s)}@${px}`
  const hit = cache.get(key)
  if (hit) {
    cache.delete(key) // refresh its place in the LRU order
    cache.set(key, hit)
    return hit
  }
  const job = queue.then(() => draw(s, px))
  queue = job.catch(() => undefined)
  cache.set(key, job)
  job.catch(() => cache.delete(key))
  if (cache.size > MAX) cache.delete(cache.keys().next().value!)
  return job
}
