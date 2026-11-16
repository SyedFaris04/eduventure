import Phaser from 'phaser'
import { gridToScreen, screenToGrid, type Point } from '../iso'
import { parseMap, type GameMap, type PropKind } from '../map'
import { GREENHAVEN } from '../maps/greenhaven'
import { followPath, INTERACT_RANGE, screenDirToGrid, step, tapGoal } from '../movement'
import { layoutFor, paintGround, type WorldLayout } from '../art/tiles'
import { useGame, worldPaused } from '../store'

const CHAR_SCALE = 0.5
// Image origin (x, y as fractions) per prop so the base sits on its tile.
const PROP_ORIGIN: Record<PropKind, [number, number]> = {
  tree: [0.5, 0.92],
  bush: [0.5, 0.86],
  rock: [0.5, 0.86],
  fence: [0.5, 0.72],
  well: [0.5, 0.9],
  house: [0.5, 0.976],
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export class WorldScene extends Phaser.Scene {
  private map!: GameMap
  private L!: WorldLayout
  private hero!: Phaser.GameObjects.Image
  private heroShadow!: Phaser.GameObjects.Image
  private pos: Point = { x: 0, y: 0 }
  private path: Point[] = []
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private walkTime = 0
  private lastEmit = 0
  private lastInteractSeq = 0
  private panelClosedAt = -Infinity
  private unsubscribe?: () => void

  constructor() {
    super('world')
  }

  /** Grid point → world pixels. */
  toWorld(p: Point) {
    const s = gridToScreen(p)
    return { x: this.L.ox + s.x, y: this.L.oy + s.y }
  }

  create() {
    this.map = parseMap(GREENHAVEN)
    this.L = layoutFor(this.map)
    const glint = paintGround(this, this.map, this.L)
    if (!reducedMotion()) this.tweens.add({ targets: glint, alpha: 0.2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    for (const p of this.map.props) {
      // Houses cover 2 × 2 tiles: anchor at the footprint's front corner.
      const at = p.kind === 'house' ? this.toWorld({ x: p.x + 2, y: p.y + 2 }) : this.toWorld({ x: p.x + 0.5, y: p.y + 0.5 + 0.35 })
      const img = this.add.image(at.x, at.y, p.kind).setOrigin(...PROP_ORIGIN[p.kind])
      img.setDepth(p.kind === 'house' ? this.toWorld({ x: p.x + 1, y: p.y + 1 }).y : at.y - 4)
    }

    for (const npc of this.map.npcs) {
      const at = this.toWorld({ x: npc.x + 0.5, y: npc.y + 0.5 })
      this.add.image(at.x, at.y + 2, 'shadow').setDepth(at.y - 1)
      const sprite = this.add.image(at.x, at.y, `npc-${npc.id}`).setOrigin(0.5, 0.95).setScale(CHAR_SCALE).setDepth(at.y)
      if (!reducedMotion()) this.tweens.add({ targets: sprite, scaleY: CHAR_SCALE * 1.02, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    this.pos = { x: this.map.spawn.x + 0.5, y: this.map.spawn.y + 0.5 }
    const start = this.toWorld(this.pos)
    this.heroShadow = this.add.image(start.x, start.y + 2, 'shadow')
    this.hero = this.add.image(start.x, start.y, 'hero-front').setOrigin(0.5, 0.95).setScale(CHAR_SCALE)

    const cam = this.cameras.main
    cam.setBounds(0, 0, this.L.width, this.L.height)
    cam.startFollow(this.hero, true, 0.12, 0.12)
    // Canvas pixels = CSS pixels × dpr; zoom in a little more on wide screens.
    const dpr = (this.registry.get('dpr') as number) ?? 1
    const fitZoom = () => cam.setZoom((this.scale.width / dpr >= 900 ? 1.25 : 1) * dpr)
    fitZoom()
    this.scale.on('resize', fitZoom)

    // No key capture: the page never scrolls, and capturing would stop buttons and answer fields receiving keys.
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER', false) as Record<string, Phaser.Input.Keyboard.Key>
    for (const k of ['E', 'SPACE', 'ENTER']) this.keys[k].on('down', () => this.interact())

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapTo(p.worldX, p.worldY))

    this.lastInteractSeq = useGame.getState().interactSeq
    this.unsubscribe = useGame.subscribe((s, prev) => {
      // The key that closes a panel must not immediately reopen it on the game's side.
      if ((prev.dialogue && !s.dialogue) || (prev.battle && !s.battle)) this.panelClosedAt = this.time.now
      if (s.interactSeq !== this.lastInteractSeq) {
        this.lastInteractSeq = s.interactSeq
        this.interact()
      }
    })
    this.events.once('shutdown', () => this.unsubscribe?.())
    this.events.once('destroy', () => this.unsubscribe?.())
    this.placeHero(0)
  }

  /** Tap or click on the ground: walk there (or beside it, for NPCs and other blocked tiles). */
  private tapTo(worldX: number, worldY: number) {
    if (worldPaused()) return
    const g = screenToGrid({ x: worldX - this.L.ox, y: worldY - this.L.oy })
    const from = { x: Math.floor(this.pos.x), y: Math.floor(this.pos.y) }
    this.path = tapGoal({ x: Math.floor(g.x), y: Math.floor(g.y) }, from, this.map.blocked) ?? []
  }

  private interact() {
    if (worldPaused() || this.time.now - this.panelClosedAt < 300) return
    const prompt = useGame.getState().prompt
    if (prompt?.kind === 'npc') useGame.setState({ dialogue: { npc: prompt.id, page: 0 } })
  }

  private readInput(): Point {
    const k = this.keys
    const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0)
    const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0)
    if (x || y) return { x, y }
    return useGame.getState().stick
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.05)
    let moved = false
    if (!worldPaused()) {
      const input = this.readInput()
      let dir: Point = { x: 0, y: 0 }
      let next = this.pos
      if (input.x || input.y) {
        this.path = []
        const len = Math.min(1, Math.hypot(input.x, input.y))
        const g = screenDirToGrid(input)
        dir = { x: g.x * len, y: g.y * len }
        next = step(this.pos, dir, dt, this.map.blocked)
      } else if (this.path.length) {
        const r = followPath(this.pos, this.path, dt, this.map.blocked)
        ;({ dir, path: this.path } = r)
        next = r.pos
      }
      if (dir.x || dir.y) {
        moved = next.x !== this.pos.x || next.y !== this.pos.y
        this.pos = next
        const screenDx = dir.x - dir.y
        const screenDy = dir.x + dir.y
        this.hero.setTexture(screenDy < -0.2 ? 'hero-back' : 'hero-front')
        if (Math.abs(screenDx) > 0.2) this.hero.setFlipX(screenDx < 0)
      }
    }
    this.walkTime = moved ? this.walkTime + dt : 0
    this.placeHero(this.walkTime)
    this.updatePrompt()
    if (_time - this.lastEmit > 150) {
      this.lastEmit = _time
      useGame.setState({ player: { x: this.pos.x, y: this.pos.y } })
    }
  }

  private placeHero(walkTime: number) {
    const at = this.toWorld(this.pos)
    const bob = walkTime && !reducedMotion() ? Math.abs(Math.sin(walkTime * 14)) * 3 : 0
    this.hero.setPosition(at.x, at.y - bob).setDepth(at.y)
    this.heroShadow.setPosition(at.x, at.y + 2).setDepth(at.y - 1)
  }

  private updatePrompt() {
    const near = this.map.npcs.find((n) => Math.hypot(n.x + 0.5 - this.pos.x, n.y + 0.5 - this.pos.y) <= INTERACT_RANGE)
    const current = useGame.getState().prompt
    const next = near ? ({ kind: 'npc', id: near.id } as const) : null
    if (current?.id !== next?.id) useGame.setState({ prompt: next })
  }
}
