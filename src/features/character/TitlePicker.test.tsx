import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'
import { TitlePicker } from './TitlePicker'

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

describe('TitlePicker', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('offers only titles the level has unlocked', () => {
    wrap(<TitlePicker uid="u" level={4} current={null} onPick={vi.fn()} />)
    const opts = screen.getAllByRole('option') as HTMLOptionElement[]
    const byValue = Object.fromEntries(opts.map((o) => [o.value, o]))
    expect(byValue['kampung_hero'].disabled).toBe(false)
    expect(byValue['island_explorer'].disabled).toBe(true)
    expect(byValue['island_explorer'].textContent).toMatch(/10/)
  })

  it('sends the pick, and "No title" sends null', async () => {
    const onPick = vi.fn().mockResolvedValue(undefined)
    wrap(<TitlePicker uid="u" level={10} current="kampung_hero" onPick={onPick} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'island_explorer' } })
    await waitFor(() => expect(onPick).toHaveBeenCalledWith('island_explorer'))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } })
    await waitFor(() => expect(onPick).toHaveBeenLastCalledWith(null))
  })
})
