import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'

const state = vi.hoisted(() => ({ visibility: { visible: true, reason: null as string | null }, setVisible: vi.fn(async () => undefined) }))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('./multiplayerApi', () => ({ visibilityKey: () => ['visibility'], useMyVisibility: () => ({ data: state.visibility }), setVisible: state.setVisible }))

const { VisibilitySetting } = await import('./VisibilitySetting')
const show = () => render(<QueryClientProvider client={new QueryClient()}><VisibilitySetting /></QueryClientProvider>)

describe('VisibilitySetting', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => state.setVisible.mockClear())

  it('lets players hide themselves from others', async () => {
    state.visibility = { visible: true, reason: null }
    show()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Let other players see me' }))
    await waitFor(() => expect(state.setVisible).toHaveBeenCalledWith('u', false))
  })

  it('explains, and locks the switch, when a parent turned it off', () => {
    state.visibility = { visible: false, reason: 'parent' }
    show()
    expect((screen.getByRole('checkbox', { name: 'Let other players see me' }) as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText('Your parent has turned this off.')).toBeTruthy()
  })
})
