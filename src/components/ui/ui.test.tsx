import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, ProgressBar } from './index'

describe('ProgressBar', () => {
  it('exposes the value as a percentage', () => {
    render(<ProgressBar value={0.78} label="Loading" />)
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toHaveAttribute('aria-valuenow', '78')
  })

  it('clamps values above 1 to 100', () => {
    render(<ProgressBar value={1.4} label="Loading" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })
})

describe('Card', () => {
  it('is a toggle button reflecting selection', async () => {
    const onSelect = vi.fn()
    const { rerender } = render(<Card onSelect={onSelect}>Primary School</Card>)
    const card = screen.getByRole('button', { name: 'Primary School' })
    expect(card).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(card)
    expect(onSelect).toHaveBeenCalledOnce()
    rerender(<Card onSelect={onSelect} selected>Primary School</Card>)
    expect(card).toHaveAttribute('aria-pressed', 'true')
  })
})
