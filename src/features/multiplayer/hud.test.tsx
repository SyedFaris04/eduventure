import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'
import { usePlace } from '../../game/placeStore'

const api = vi.hoisted(() => ({ blockPlayer: vi.fn(async () => undefined), reportPlayer: vi.fn(async () => undefined) }))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('./multiplayerApi', async (orig) => ({ ...(await orig<object>()), ...api }))

const room = await import('./useRoom')
const { EmoteBar } = await import('./EmoteBar')
const { PlayerCard } = await import('./PlayerCard')
const { RoomStatus } = await import('./RoomStatus')
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)
const other = { id: 'P1', name: 'Sunny Day', appearance: {} as never, pet: null, x: 1, y: 1, battle: false }

describe('multiplayer HUD', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    room.useRoom.setState(room.EMPTY_ROOM)
    useGame.setState({ playerCard: null })
    api.blockPlayer.mockClear()
    api.reportPlayer.mockClear()
  })

  it('the emote bar sends a wave, and is hidden for players who may not emote', () => {
    const send = vi.fn()
    room.useRoom.setState({ status: 'online', canEmote: true })
    const { unmount } = wrap(<EmoteBar onEmote={send} />)
    fireEvent.click(screen.getByRole('button', { name: 'Emotes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Wave' }))
    expect(send).toHaveBeenCalledWith('wave')
    unmount()
    room.useRoom.setState({ canEmote: false })
    wrap(<EmoteBar onEmote={send} />)
    expect(screen.queryByRole('button', { name: 'Emotes' })).toBeNull()
  })

  it('Hide this player blocks them and removes them at once', async () => {
    room.useRoom.setState({ status: 'online', players: { P1: other } })
    useGame.setState({ playerCard: 'P1' })
    wrap(<PlayerCard />)
    expect(screen.getByRole('dialog', { name: 'Sunny Day' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hide this player' }))
    await waitFor(() => expect(api.blockPlayer).toHaveBeenCalledWith('P1'))
    await waitFor(() => expect(room.useRoom.getState().players.P1).toBeUndefined())
    expect(useGame.getState().playerCard).toBeNull()
  })

  it('Report sends the reason and the island, then thanks the player', async () => {
    usePlace.setState({ place: 'greenhaven' })
    room.useRoom.setState({ status: 'online', players: { P1: other } })
    useGame.setState({ playerCard: 'P1' })
    wrap(<PlayerCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Report' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rude name' }))
    await waitFor(() => expect(api.reportPlayer).toHaveBeenCalledWith('P1', 'rude_name', 'greenhaven'))
    expect(await screen.findByText(/a moderator will look at this/)).toBeTruthy()
  })

  it('the solo note shows only while the room server cannot be reached', () => {
    room.useRoom.setState({ status: 'online' })
    const { container, rerender } = wrap(<RoomStatus />)
    expect(container.textContent).toBe('')
    room.useRoom.setState({ status: 'solo' })
    rerender(<QueryClientProvider client={new QueryClient()}><RoomStatus /></QueryClientProvider>)
    expect(screen.getByText('Playing solo')).toBeTruthy()
  })
})
