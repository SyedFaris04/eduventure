import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'

vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
const now = new Date().toISOString()
const notes = [
  { id: 1, public_id: 'p-mine', name: 'Me', sticker: 'star', phrase: null, body: null, created_at: now, mine: true },
  { id: 2, public_id: 'p-other', name: null, sticker: null, phrase: 'p01', body: 'Plants make oxygen', created_at: now, mine: false },
]
const api = vi.hoisted(() => ({
  board: { open: true, notes: [] as unknown[] },
  postNote: vi.fn(),
  reportNote: vi.fn(),
  deleteMyNote: vi.fn(),
  block: vi.fn(),
}))
vi.mock('./boardApi', async (orig) => ({
  ...(await orig<object>()),
  useIslandBoard: () => ({ data: api.board }),
  useBoardRights: () => ({ data: { can_write: true, can_type: true, reason: null } }),
  postNote: api.postNote,
  reportNote: api.reportNote,
  deleteMyNote: api.deleteMyNote,
}))
vi.mock('../multiplayer/multiplayerApi', async (orig) => ({ ...(await orig<object>()), blockPlayer: api.block }))

const { BoardPanel } = await import('./BoardPanel')
const show = () => render(<QueryClientProvider client={new QueryClient()}><BoardPanel /></QueryClientProvider>)

describe('BoardPanel', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    useGame.setState({ board: false })
    vi.clearAllMocks()
  })

  it('shows nothing while closed', () => {
    show()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it("shows today's question and the notes, in the reader's language", () => {
    api.board = { open: true, notes }
    useGame.setState({ board: true })
    show()
    expect(screen.getByText("Today's question")).toBeTruthy()
    const list = within(screen.getByRole('list'))
    expect(list.getByText('Great idea!')).toBeTruthy()
    expect(list.getByText('Plants make oxygen')).toBeTruthy()
    expect(list.getByText('Player')).toBeTruthy()
  })

  it("offers Report and Hide on others' notes, and Delete on mine", async () => {
    api.board = { open: true, notes }
    api.reportNote.mockResolvedValue(undefined)
    api.block.mockResolvedValue(undefined)
    api.deleteMyNote.mockResolvedValue(undefined)
    useGame.setState({ board: true })
    show()
    fireEvent.click(screen.getAllByRole('button', { name: 'Note options' })[1])
    fireEvent.click(screen.getByRole('button', { name: 'Report' }))
    fireEvent.click(screen.getByRole('button', { name: 'Unkind' }))
    expect(api.reportNote).toHaveBeenCalledWith(2, 'unkind')
    expect(await screen.findByText('Thank you. A moderator will look at it.')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Note options' })[1])
    fireEvent.click(screen.getByRole('button', { name: 'Hide this player' }))
    expect(api.block).toHaveBeenCalledWith('p-other')
    fireEvent.click(screen.getAllByRole('button', { name: 'Note options' })[0])
    expect(screen.queryByRole('button', { name: 'Report' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(api.deleteMyNote).toHaveBeenCalledWith(1)
  })

  it('a board whose stand is not built says what is needed', () => {
    api.board = { open: false, notes: [] }
    useGame.setState({ board: true })
    show()
    expect(screen.getByText(/builds the whiteboard stand/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pin' })).toBeNull()
  })
})
