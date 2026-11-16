import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DEFAULT_APPEARANCE } from '../../features/character/appearance'

const webgl = vi.hoisted(() => ({ ok: false, previews: 0 }))
vi.mock('../webgl', () => ({ hasWebGL: () => webgl.ok }))
vi.mock('./HeroPreview', () => ({
  default: () => {
    webgl.previews++
    return <p>live preview</p>
  },
}))
const { HeroPreviewSlot } = await import('./HeroPreviewSlot')

describe('HeroPreviewSlot', () => {
  it('without WebGL keeps a labelled picture slot and never starts the 3D preview', () => {
    webgl.ok = false
    render(<HeroPreviewSlot appearance={DEFAULT_APPEARANCE} label="Your hero, Sam" />)
    expect(screen.getByRole('img', { name: 'Your hero, Sam' })).toBeTruthy()
    expect(webgl.previews).toBe(0)
  })

  it('with WebGL shows the live preview inside the labelled slot', async () => {
    webgl.ok = true
    render(<HeroPreviewSlot appearance={DEFAULT_APPEARANCE} label="Your hero, Sam" />)
    expect(await screen.findByText('live preview')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Your hero, Sam' })).toBeTruthy()
  })
})
