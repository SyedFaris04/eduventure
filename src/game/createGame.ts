import Phaser from 'phaser'
import type { Appearance } from '../features/character/appearance'
import { BootScene } from './scenes/BootScene'
import { WorldScene } from './scenes/WorldScene'

/**
 * The only module that imports Phaser at runtime; loaded on demand by the /world route.
 * The canvas renders at the device pixel ratio (capped at 2) and is shown at CSS size, so art stays
 * crisp on phones; scenes multiply their camera zoom by `dpr` from the registry.
 */
export function createGame(parent: HTMLElement, opts: { hero: Appearance }) {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const cssSize = () => ({ w: Math.max(1, parent.clientWidth), h: Math.max(1, parent.clientHeight) })
  const { w, h } = cssSize()
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#5fb3d9',
    banner: false,
    scale: { mode: Phaser.Scale.NONE, width: w * dpr, height: h * dpr, zoom: 1 / dpr },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 2 },
    scene: [BootScene, WorldScene],
  })
  game.registry.set('hero', opts.hero)
  game.registry.set('dpr', dpr)

  const observer = new ResizeObserver(() => {
    const s = cssSize()
    game.scale.resize(s.w * dpr, s.h * dpr)
  })
  observer.observe(parent)
  game.events.once(Phaser.Core.Events.DESTROY, () => observer.disconnect())
  return game
}
