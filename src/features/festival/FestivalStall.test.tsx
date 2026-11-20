import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'

const state = vi.hoisted(() => ({
  festivals: [] as { id: string; kind: string; starts_on: string; ends_on: string; preview: boolean }[],
  tokens: 0,
  owned: new Set<string>(),
  buy: vi.fn(),
}))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('../shop/useShop', () => ({ ownedItemsKey: () => ['owned'], useOwnedItems: () => ({ data: state.owned }) }))
vi.mock('../character/useCharacter', () => ({ useMyCharacter: () => ({ data: undefined }) }))
vi.mock('../pet/usePet', () => ({ usePet: () => ({ data: null }) }))
vi.mock('../../world3d/SnapshotImage', () => ({ Snapshot: () => null }))
vi.mock('./festivalApi', async (orig) => ({
  ...(await orig<object>()),
  useFestivals: () => ({ data: { festivals: state.festivals, tokens: state.tokens } }),
  buyFestivalItem: state.buy,
}))

const { FestivalStall } = await import('./FestivalStall')
const show = () => render(<QueryClientProvider client={new QueryClient()}><FestivalStall /></QueryClientProvider>)
const cny = { id: 'cny_2027', kind: 'cny', starts_on: '2027-01-30', ends_on: '2027-02-20', preview: false }
const raya = { id: 'raya_2027', kind: 'raya', starts_on: '2027-02-09', ends_on: '2027-03-17', preview: false }

describe('FestivalStall', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    state.festivals = []
    state.tokens = 0
    state.owned = new Set()
    state.buy.mockReset()
  })

  it('lists both active festivals with their items and token prices', () => {
    state.festivals = [cny, raya]
    state.tokens = 25
    show()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect((screen.getByRole('button', { name: 'Buy Lion dance hat' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getAllByText('5 more tokens')).toHaveLength(2) // the two 30-token hero items
    expect((screen.getByRole('button', { name: 'Buy Lantern charm' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByText('25 festival tokens')).toBeTruthy()
  })

  it('shows Owned for items the player has', () => {
    state.festivals = [cny]
    state.tokens = 50
    state.owned = new Set(['pet_lantern'])
    show()
    expect(screen.queryByRole('button', { name: 'Buy Lantern charm' })).toBeNull()
    expect(screen.getByText('Owned')).toBeTruthy()
  })

  it('renders nothing when no festival is on', () => {
    const { container } = show()
    expect(container.innerHTML).toBe('')
  })

  it('shows the server reason when buying fails', async () => {
    state.festivals = [cny]
    state.tokens = 50
    state.buy.mockRejectedValue({ message: 'This festival is not on right now' })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Buy Lantern charm' }))
    expect(state.buy).toHaveBeenCalledWith('pet_lantern')
    expect(await screen.findByText("This festival isn't on right now.")).toBeTruthy()
  })
})
