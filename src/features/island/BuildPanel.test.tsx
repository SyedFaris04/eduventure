import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'
import type { Placed } from './rules'

const state = vi.hoisted(() => ({ items: [] as Placed[], level: 1, materials: { wood: 0, stone: 0, herbs: 10, crystal: 0 } }))
const api = vi.hoisted(() => ({ placeItem: vi.fn(), moveItem: vi.fn(), removeItem: vi.fn() }))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('../character/useCharacter', () => ({ useProgression: () => ({ data: { level: state.level, xp: 0, gold: 0 } }) }))
vi.mock('../harvest/harvestApi', async (orig) => ({ ...(await orig<object>()), useMaterials: () => ({ data: { materials: state.materials, tools: [] } }) }))
vi.mock('./islandApi', async (orig) => ({ ...(await orig<object>()), useIslandItems: () => ({ data: state.items }), ...api }))
vi.mock('../../world3d/SnapshotImage', () => ({ Snapshot: () => null }))

const { BuildPanel } = await import('./BuildPanel')
const show = () => render(<QueryClientProvider client={new QueryClient()}><BuildPanel /></QueryClientProvider>)
const tap = (x: number, y: number) => act(() => useGame.setState((s) => ({ buildTap: { x, y, seq: (s.buildTap?.seq ?? 0) + 1 } })))
const house: Placed = { id: 7, item: 'house_pondok', x: 10, y: 10, rot: 0 }

describe('BuildPanel', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    vi.clearAllMocks()
    state.items = []
    useGame.setState({ build: { open: false, item: null, rot: 0, mode: 'place', moving: null }, buildTap: null })
  })

  it('opens from the Build button and filters items by group', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Build' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Trees' }))
    expect(screen.getByRole('button', { name: /Coconut palm/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Pondok hut/ })).toBeNull()
  })

  it('locked items say their level and cannot be chosen; unaffordable costs show in red', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Build' }))
    const villa = screen.getByRole('button', { name: /Villa/ }) as HTMLButtonElement
    expect(villa.disabled).toBe(true)
    expect(villa.textContent).toMatch(/Level 10/)
    const hut = screen.getByRole('button', { name: /Pondok hut/ })
    expect(hut.querySelector('.text-danger')).toBeTruthy() // no wood yet
  })

  it('a tap on a free spot places the chosen item, turned', async () => {
    api.placeItem.mockResolvedValue({ item: { id: 1, item: 'bush_round', x: 12, y: 12, rot: 1 }, materials: state.materials })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Build' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Garden' }))
    fireEvent.click(screen.getByRole('button', { name: /Round bush/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Turn' }))
    tap(12, 12)
    expect(api.placeItem).toHaveBeenCalledWith('bush_round', 12, 12, 1)
    expect(await screen.findByText('Placed!')).toBeTruthy()
  })

  it('a tap where it does not fit says so and costs nothing', () => {
    state.items = [house]
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Build' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Garden' }))
    fireEvent.click(screen.getByRole('button', { name: /Round bush/ }))
    tap(11, 11)
    expect(api.placeItem).not.toHaveBeenCalled()
    expect(screen.getByText("Doesn't fit there")).toBeTruthy()
  })

  it('Remove takes the tapped item away; Move picks it up and puts it down', async () => {
    state.items = [house]
    api.removeItem.mockResolvedValue({ materials: state.materials })
    api.moveItem.mockResolvedValue({ item: { ...house, x: 20, y: 20 } })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Build' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move' }))
    tap(11, 10)
    tap(20, 20)
    expect(api.moveItem).toHaveBeenCalledWith(7, 20, 20, 0)
    await screen.findByText('Moved!') // taps during a request are ignored, as for a real player
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    tap(10, 11)
    expect(api.removeItem).toHaveBeenCalledWith(7)
  })
})
