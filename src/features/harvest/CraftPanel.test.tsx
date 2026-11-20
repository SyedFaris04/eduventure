import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'

vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('../shop/useShop', () => ({ ownedItemsKey: () => ['owned'], useOwnedItems: () => ({ data: new Set<string>() }) }))
const api = vi.hoisted(() => ({
  craft: vi.fn(),
  contribute: vi.fn(),
  useMaterials: () => ({ data: { materials: { wood: 5, stone: 3, herbs: 0, crystal: 0 }, tools: [] } }),
  useRecipes: () => ({ data: [{ id: 'stone_axe', kind: 'tool', cost: { wood: 4, stone: 3 }, sort: 10 }, { id: 'herb_crown', kind: 'cosmetic', cost: { herbs: 8 }, sort: 60 }] }),
  useCamp: () => ({ data: [{ project: 'camp_bench', cost: { wood: 40 }, built: false, given: { wood: 38 }, mine: 0 }] }),
}))
vi.mock('./harvestApi', async (orig) => ({ ...(await orig<object>()), ...api }))

const { CraftPanel } = await import('./CraftPanel')
const show = () => render(<QueryClientProvider client={new QueryClient()}><CraftPanel /></QueryClientProvider>)

describe('CraftPanel', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    useGame.setState({ workbench: false })
    api.craft.mockReset()
    api.contribute.mockReset()
  })

  it('crafts what the player can afford and greys out the rest', async () => {
    api.craft.mockResolvedValue({ materials: { wood: 1, stone: 0, herbs: 0, crystal: 0 }, tools: ['stone_axe'] })
    useGame.setState({ workbench: true })
    show()
    fireEvent.click(screen.getByRole('button', { name: /craft stone axe/i }))
    expect(api.craft).toHaveBeenCalledWith('stone_axe')
    fireEvent.click(screen.getByRole('tab', { name: /items/i }))
    expect((screen.getByRole('button', { name: /craft herb crown/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('gives only what the camp still needs', async () => {
    api.contribute.mockResolvedValue({ given: 2, materials: { wood: 3, stone: 3, herbs: 0, crystal: 0 }, camp: [] })
    useGame.setState({ workbench: true })
    show()
    fireEvent.click(screen.getByRole('tab', { name: /camp/i }))
    fireEvent.click(screen.getByRole('button', { name: /give 2 wood/i }))
    expect(api.contribute).toHaveBeenCalledWith('greenhaven', 'camp_bench', 'wood', 2)
  })
})
