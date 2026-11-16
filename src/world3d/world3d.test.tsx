import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { initI18n } from '../i18n'
import { DEFAULT_APPEARANCE } from '../features/character/appearance'

const webgl = vi.hoisted(() => ({ ok: false }))
const world = vi.hoisted(() => ({ renders: 0, fail: true }))
vi.mock('./webgl', () => ({ hasWebGL: () => webgl.ok }))
vi.mock('./World3D', () => ({
  default: () => {
    world.renders++
    if (world.fail) throw new Error('model download failed')
    return <p>world ready</p>
  },
}))

const { GameCanvas } = await import('../features/world/GameCanvas')

describe('GameCanvas', () => {
  beforeAll(async () => {
    await initI18n()
  })
  beforeEach(() => {
    world.renders = 0
    vi.spyOn(console, 'error').mockImplementation(() => undefined) // React logs caught render errors
  })

  it('shows the no-WebGL message when WebGL is unavailable', () => {
    webgl.ok = false
    render(<GameCanvas hero={DEFAULT_APPEARANCE} />)
    expect(screen.getByText("Your device can't show the 3D world. Try another browser or device.")).toBeTruthy()
    expect(world.renders).toBe(0)
  })

  it('shows Retry when the world fails to load, and Retry loads it again', async () => {
    webgl.ok = true
    world.fail = true
    // The place's map downloads first (Suspense), so let React finish inside act.
    await act(async () => void render(<GameCanvas hero={DEFAULT_APPEARANCE} />))
    expect(await screen.findByText("The world didn't load. Check your connection.", undefined, { timeout: 5000 })).toBeTruthy() // the place's map loads first
    expect(screen.getByRole('application', { name: /^Greenhaven Kampung\. Move with/ })).toBeTruthy() // names the current place
    const before = world.renders
    world.fail = false
    await act(async () => userEvent.click(screen.getByRole('button', { name: 'Try again' })))
    expect(await screen.findByText('world ready', undefined, { timeout: 5000 })).toBeTruthy()
    expect(world.renders).toBeGreaterThan(before)
  })
})
