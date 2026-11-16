import Phaser from 'phaser'
import { renderCharacterSvg } from '../../features/character/renderCharacterSvg'
import type { Appearance } from '../../features/character/appearance'
import { makePropTextures } from '../art/tiles'
import { NPCS } from '../npcs'

/** Rasterises an SVG string into a Phaser texture (2× size; sprites are shown at 0.5 scale for crisp edges). */
export async function addSvgTexture(scene: Phaser.Scene, key: string, svg: string) {
  if (scene.textures.exists(key)) scene.textures.remove(key)
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await img.decode()
  scene.textures.addImage(key, img)
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  async create() {
    makePropTextures(this)
    const hero = this.registry.get('hero') as Appearance
    const jobs: Promise<void>[] = [
      addSvgTexture(this, 'hero-front', renderCharacterSvg(hero, { size: 96 })),
      addSvgTexture(this, 'hero-back', renderCharacterSvg(hero, { size: 96, facing: 'back' })),
      ...Object.entries(NPCS).map(([id, npc]) => addSvgTexture(this, `npc-${id}`, renderCharacterSvg(npc.appearance, { size: 96 }))),
    ]
    await Promise.all(jobs)
    this.scene.start('world')
  }
}
