import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const rpc = vi.hoisted(() =>
  vi.fn(async (fn: string) => ({
    data: fn === 'open_reports' ? [{ id: 7, reported_public_id: 'pid-1', name: 'Rude Rider', reason: 'rude_name', place: 'greenhaven', created_at: '2026-11-21T01:00:00Z', open_count: 3 }] : null,
    error: null,
  })),
)
vi.mock('../../services/supabase', () => ({ supabase: { rpc } }))

const { PlayerReports } = await import('./PlayerReports')
const show = () => render(<QueryClientProvider client={new QueryClient()}><PlayerReports /></QueryClientProvider>)

describe('PlayerReports', () => {
  afterEach(() => rpc.mockClear())

  it('lists open reports and closes one', async () => {
    show()
    expect(await screen.findByText('Rude Rider')).toBeTruthy()
    expect(screen.getByText(/3 open/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close report 7' }))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('close_report', { p_id: 7 }))
  })

  it('bans only after the confirm box is ticked', async () => {
    show()
    await screen.findByText('Rude Rider')
    const ban = screen.getByRole('button', { name: 'Ban Rude Rider from multiplayer' }) as HTMLButtonElement
    expect(ban.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Confirm ban for Rude Rider' }))
    fireEvent.click(ban)
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('ban_from_multiplayer', { p_public_id: 'pid-1', p_banned: true }))
  })
})
