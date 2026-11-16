import Phaser from 'phaser'
import { gridToScreen, screenToGrid, type Point } from '../iso'
import { parseMap, type GameMap, type MonsterKind, type PropKind } from '../map'
import { GREENHAVEN } from '../maps/greenhaven'
import { followPath, INTERACT_RANGE, screenDirToGrid, step, tapGoal } from '../movement'
import { layoutFor, paintGround, type WorldLayout } from '../art/tiles'
import { useGame, worldPaused, type Prompt } from '../store'

const CHAR_SCALE = 0.5
const MONSTER_COUNT: Record<MonsterKind, number> = { sproutling: 4, pebblewing: 3, dinobud: 3 }
const MONSTER_SCALE: Record<MonsterKind, number> = { sproutling: 0.42, pebblewing: 0.42, dinobud: 0.55 }
const RESPAWN_MS = 20_000
const WALK_CYCLE = [1, 0, -1, 0] as const

type Monster = { id: string; kind: MonsterKind; pos: Point; target?: Point; sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; alive: boolean; nextMove: number }
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
  private facing: 'front' | 'back' = 'front'
  private monsters: Monster[] = []
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

    this.spawnMonsters()

    for (const boss of this.map.bosses) {
      const at = this.toWorld({ x: boss.x + 0.5, y: boss.y + 0.5 })
      this.add.image(at.x, at.y + 4, 'shadow').setScale(2.2, 1.6).setDepth(at.y - 1)
      const sprite = this.add.image(at.x, at.y, `boss-${boss.id}`).setOrigin(0.5, 0.92).setScale(0.62).setDepth(at.y)
      if (!reducedMotion()) this.tweens.add({ targets: sprite, scaleY: 0.64, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    this.pos = { x: this.map.spawn.x + 0.5, y: this.map.spawn.y + 0.5 }
    const start = this.toWorld(this.pos)
    this.heroShadow = this.add.image(start.x, start.y + 2, 'shadow')
    this.hero = this.add.image(start.x, start.y, 'hero-front-0').setOrigin(0.5, 0.95).setScale(CHAR_SCALE)

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
      if ((prev.dialogue && !s.dialogue) || (prev.battle && !s.battle) || (prev.boss && !s.boss)) this.panelClosedAt = this.time.now
      // Battle panels cover the world: stop rendering it to save battery and keep phones responsive.
      const covered = (x: typeof s) => Boolean(x.battle || x.boss)
      if (!covered(prev) && covered(s)) this.game.loop.sleep()
      if (covered(prev) && !covered(s)) this.game.loop.wake()
      if (s.defeated.length) {
        for (const id of s.defeated) this.defeat(id)
        useGame.setState({ defeated: [] })
      }
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
    if (prompt?.kind === 'monster') useGame.setState({ battle: { monsterId: prompt.id, monster: prompt.monster } })
    if (prompt?.kind === 'boss') useGame.setState({ boss: prompt.id })
  }

  private freeZoneTile(kind: MonsterKind): Point {
    const tiles = this.map.monsterZones[kind]
    for (let i = 0; i < 20; i++) {
      const t = tiles[Math.floor(Math.random() * tiles.length)]
      if (!this.monsters.some((m) => m.alive && Math.floor(m.pos.x) === t.x && Math.floor(m.pos.y) === t.y)) return t
    }
    return tiles[0]
  }

  private spawnMonsters() {
    for (const kind of Object.keys(MONSTER_COUNT) as MonsterKind[])
      for (let i = 0; i < MONSTER_COUNT[kind]; i++) {
        const t = this.freeZoneTile(kind)
        const pos = { x: t.x + 0.5, y: t.y + 0.5 }
        const at = this.toWorld(pos)
        const shadow = this.add.image(at.x, at.y + 2, 'shadow').setScale(1.1)
        const sprite = this.add.image(at.x, at.y, `monster-${kind}`).setOrigin(0.5, 0.92).setScale(MONSTER_SCALE[kind])
        if (!reducedMotion()) this.tweens.add({ targets: sprite, scaleY: MONSTER_SCALE[kind] * 1.05, duration: 700 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
        this.monsters.push({ id: `${kind}-${i}`, kind, pos, sprite, shadow, alive: true, nextMove: this.time.now + 1500 + Math.random() * 3000 })
      }
  }

  /** Defeated monsters vanish and a fresh one appears elsewhere in their zone a little later. */
  private defeat(id: string) {
    const m = this.monsters.find((x) => x.id === id)
    if (!m || !m.alive) return
    m.alive = false
    this.tweens.add({ targets: [m.sprite, m.shadow], alpha: 0, duration: 400 })
    this.time.delayedCall(RESPAWN_MS, () => {
      const t = this.freeZoneTile(m.kind)
      m.pos = { x: t.x + 0.5, y: t.y + 0.5 }
      m.alive = true
      this.tweens.add({ targets: [m.sprite, m.shadow], alpha: 1, duration: 600 })
    })
  }

  /** Each monster drifts to a neighbouring tile of its zone every few seconds. */
  private wander(dt: number) {
    for (const m of this.monsters) {
      if (m.alive && !worldPaused() && this.time.now > m.nextMove) {
        m.nextMove = this.time.now + 2000 + Math.random() * 3500
        const zone = this.map.monsterZones[m.kind]
        const options = zone.filter((t) => Math.abs(t.x + 0.5 - m.pos.x) <= 1 && Math.abs(t.y + 0.5 - m.pos.y) <= 1 && !this.map.blocked(t.x, t.y))
        const t = options[Math.floor(Math.random() * options.length)]
        if (t) m.target = { x: t.x + 0.5, y: t.y + 0.5 }
      }
      const target = m.target
      if (target) {
        const v = { x: target.x - m.pos.x, y: target.y - m.pos.y }
        const d = Math.hypot(v.x, v.y)
        const stepLen = Math.min(d, 1.1 * dt)
        if (d < 0.02) m.target = undefined
        else m.pos = { x: m.pos.x + (v.x / d) * stepLen, y: m.pos.y + (v.y / d) * stepLen }
        if (Math.abs(v.x - v.y) > 0.05) m.sprite.setFlipX(v.x - v.y < 0)
      }
      const at = this.toWorld(m.pos)
      m.sprite.setPosition(at.x, at.y).setDepth(at.y)
      m.shadow.setPosition(at.x, at.y + 2).setDepth(at.y - 1)
    }
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
        this.facing = screenDy < -0.2 ? 'back' : 'front'
        if (Math.abs(screenDx) > 0.2) this.hero.setFlipX(screenDx < 0)
      }
    }
    this.walkTime = moved ? this.walkTime + dt : 0
    this.placeHero(this.walkTime)
    this.wander(dt)
    this.updatePrompt()
    if (_time - this.lastEmit > 150) {
      this.lastEmit = _time
      useGame.setState({
        player: { x: this.pos.x, y: this.pos.y },
        monsters: this.monsters.filter((m) => m.alive).map((m) => ({ id: m.id, kind: m.kind, x: m.pos.x, y: m.pos.y })),
      })
    }
  }

  private placeHero(walkTime: number) {
    const at = this.toWorld(this.pos)
    // Walk cycle at 8 frames a second: left step, stand, right step, stand. A small bob on each step.
    const frame = walkTime ? WALK_CYCLE[Math.floor(walkTime * 8) % WALK_CYCLE.length] : 0
    this.hero.setTexture(`hero-${this.facing}-${frame}`)
    const bob = walkTime && !reducedMotion() ? Math.abs(Math.sin(walkTime * Math.PI * 4)) * 2 : 0
    this.hero.setPosition(at.x, at.y - bob).setDepth(at.y)
    this.heroShadow.setPosition(at.x, at.y + 2).setDepth(at.y - 1)
  }

  private updatePrompt() {
    const dist = (p: Point) => Math.hypot(p.x - this.pos.x, p.y - this.pos.y)
    const npc = this.map.npcs.find((n) => dist({ x: n.x + 0.5, y: n.y + 0.5 }) <= INTERACT_RANGE)
    const boss = this.map.bosses.find((b) => dist({ x: b.x + 0.5, y: b.y + 0.5 }) <= INTERACT_RANGE)
    const monster = this.monsters.filter((m) => m.alive && dist(m.pos) <= INTERACT_RANGE).sort((a, b) => dist(a.pos) - dist(b.pos))[0]
    const next: Prompt | null = npc
      ? { kind: 'npc', id: npc.id }
      : boss
        ? { kind: 'boss', id: boss.id }
        : monster
          ? { kind: 'monster', id: monster.id, monster: monster.kind }
          : null
    const current = useGame.getState().prompt
    if (current?.id !== next?.id) useGame.setState({ prompt: next })
  }
}
