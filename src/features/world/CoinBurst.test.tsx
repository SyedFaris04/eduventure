import { afterEach, describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import { useGame } from '../../game/store'
import { screenOf } from '../../game/screen'
import { CoinBurst } from './CoinBurst'

describe('CoinBurst', () => {
  afterEach(() => {
    useGame.setState({ battle: null, defeated: [], monsters: [] })
    screenOf.current = null
  })

  it('waits for the battle panel to close, then flies coins from the defeated monster', () => {
    screenOf.current = (p) => ({ x: p.x * 10, y: p.y * 10 })
    useGame.setState({ battle: { monsterId: 'sproutling-0', monster: 'sproutling' }, monsters: [{ id: 'sproutling-0', kind: 'sproutling', x: 5, y: 6 }] })
    const { container } = render(<CoinBurst />)
    act(() => useGame.setState((s) => ({ defeated: [...s.defeated, 'sproutling-0'] })))
    expect(container.querySelectorAll('[data-coin]')).toHaveLength(0) // still covered by the panel
    act(() => useGame.setState({ battle: null }))
    expect(container.querySelectorAll('[data-coin]')).toHaveLength(8)
  })

  it('does nothing when the world is not on screen', () => {
    useGame.setState({ battle: { monsterId: 'sproutling-0', monster: 'sproutling' }, monsters: [{ id: 'sproutling-0', kind: 'sproutling', x: 5, y: 6 }] })
    const { container } = render(<CoinBurst />)
    act(() => useGame.setState((s) => ({ defeated: [...s.defeated, 'sproutling-0'] })))
    act(() => useGame.setState({ battle: null }))
    expect(container.querySelectorAll('[data-coin]')).toHaveLength(0)
  })
})
