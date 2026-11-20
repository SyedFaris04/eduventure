import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const note = { id: 9, place: 'greenhaven', sticker: 'star', phrase: 'p01', body: 'meet me behind the school', public_id: 'pid-9', name: 'Bad Rider', hidden: true, reports: 3, reasons: ['personal_info'], created_at: '2026-11-21T01:00:00Z' }
const rpc = vi.hoisted(() => vi.fn())
vi.mock('../../services/supabase', () => ({ supabase: { rpc } }))

const { ReportedNotes } = await import('./ReportedNotes')
const show = () => render(<QueryClientProvider client={new QueryClient()}><ReportedNotes /></QueryClientProvider>)

describe('ReportedNotes', () => {
  afterEach(() => rpc.mockReset())

  it('lists reported notes with what they say and how many reports', async () => {
    rpc.mockImplementation(async (fn: string) => ({ data: fn === 'reported_notes' ? [note] : null, error: null }))
    show()
    expect(await screen.findByText('meet me behind the school')).toBeTruthy()
    expect(screen.getByText(/Great idea!/)).toBeTruthy()
    expect(screen.getByText(/3 reports \(Personal information\) · hidden/)).toBeTruthy()
  })

  it('removes or keeps a note, and bans only after confirming', async () => {
    rpc.mockImplementation(async (fn: string) => ({ data: fn === 'reported_notes' ? [note] : null, error: null }))
    show()
    await screen.findByText('meet me behind the school')
    fireEvent.click(screen.getByRole('button', { name: 'Remove note 9' }))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('resolve_note', { p_id: 9, p_remove: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep note 9' }))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('resolve_note', { p_id: 9, p_remove: false }))
    const ban = screen.getByRole('button', { name: 'Ban Bad Rider from multiplayer' }) as HTMLButtonElement
    expect(ban.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Confirm ban for Bad Rider' }))
    fireEvent.click(ban)
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('ban_from_multiplayer', { p_public_id: 'pid-9', p_banned: true }))
  })
})
