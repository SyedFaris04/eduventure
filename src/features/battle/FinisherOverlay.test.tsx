import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'
import { FINISHER } from '../../world3d/finisher'
import { FinisherOverlay } from './FinisherOverlay'

describe('the defeat cutscene overlay', () => {
  beforeAll(async () => {
    await initI18n()
  })
  beforeEach(() => {
    vi.useFakeTimers()
    useGame.setState({ finisher: { monsterId: 'm1', name: 'Sproutling', startedAt: 0 }, defeated: [] })
  })
  afterEach(() => {
    vi.useRealTimers()
    useGame.setState({ finisher: null, defeated: [] })
  })

  it('shows the victory banner while it plays, then hands over to the rewards', () => {
    render(<FinisherOverlay />)
    expect(screen.getByText('Victory!')).toBeTruthy()
    expect(screen.getByText('Sproutling defeated!')).toBeTruthy()
    act(() => vi.advanceTimersByTime(FINISHER.duration))
    expect(useGame.getState().finisher).toBeNull()
    expect(useGame.getState().defeated).toEqual(['m1']) // removed even if the 3D world never drew a frame
    expect(screen.queryByText('Victory!')).toBeNull()
  })

  it('a tap skips straight to the rewards', () => {
    render(<FinisherOverlay />)
    fireEvent.pointerDown(screen.getByRole('status'))
    expect(useGame.getState().finisher).toBeNull()
  })
})
