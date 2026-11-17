import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'
import { usePlace } from '../../game/placeStore'
import { JettyPanel } from './JettyPanel'

describe('JettyPanel', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => useGame.setState({ jetty: false, travel: null }))

  it('lists every place: here, sail, or coming soon', () => {
    usePlace.setState({ place: 'greenhaven', arriving: false })
    useGame.setState({ jetty: true })
    render(<JettyPanel />)
    expect(screen.getByText(/you are here/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /sail to science island/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /sail to mathematics mountains/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /sail to technology city/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /sail to greenhaven/i })).toBeNull()
    expect(screen.queryByText(/coming soon/i)).toBeNull() // every island is built
    expect(screen.getByRole('button', { name: /sail to language kingdom/i })).toBeTruthy()
  })

  it('shows how many Returning monsters wait on each island', () => {
    usePlace.setState({ place: 'greenhaven', arriving: false })
    useGame.setState({ jetty: true })
    render(<JettyPanel returning={{ science_island: 2 }} />)
    expect(screen.getByText('✨ 2 returning')).toBeTruthy()
    expect(screen.getAllByText(/returning/)).toHaveLength(1)
  })

  it('Sail starts the trip and closes the panel', () => {
    usePlace.setState({ place: 'greenhaven', arriving: false })
    useGame.setState({ jetty: true })
    render(<JettyPanel />)
    fireEvent.click(screen.getByRole('button', { name: /sail to science island/i }))
    expect(useGame.getState().travel).toEqual({ to: 'science_island' })
    expect(useGame.getState().jetty).toBe(false)
  })

  it('Escape closes it', () => {
    useGame.setState({ jetty: true })
    render(<JettyPanel />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useGame.getState().jetty).toBe(false)
  })
})
