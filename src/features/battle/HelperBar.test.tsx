import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { HelperBar } from './HelperBar'
import type { PublicQuestion } from './questionSchema'

const mcq = { id: 'q1', type: 'mcq', prompt: 'p', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }, { id: 'd', text: 'D' }], difficulty: 1, subject: 'mathematics', status: 'published' } as unknown as PublicQuestion
const tf = { ...mcq, type: 'true_false', options: null } as unknown as PublicQuestion
const fresh = { second_chance_left: false, fifty_used: false, hidden: [] }

describe('fifty button', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('is locked below level 8', () => {
    render(<HelperBar level={7} helpers={fresh} question={mcq} onFifty={vi.fn()} />)
    const b = screen.getByRole('button', { name: /50\/50/ })
    expect(b).toBeDisabled()
    expect(b.textContent).toMatch(/level 8/i)
  })

  it('is disabled with a reason on a true/false question', () => {
    render(<HelperBar level={8} helpers={fresh} question={tf} onFifty={vi.fn()} />)
    const b = screen.getByRole('button', { name: /50\/50/ })
    expect(b).toBeDisabled()
    expect(b.getAttribute('title')).toMatch(/two wrong/i)
  })

  it('calls onFifty on a choice question, then greys out once used', () => {
    const onFifty = vi.fn()
    const { rerender } = render(<HelperBar level={8} helpers={fresh} question={mcq} onFifty={onFifty} />)
    fireEvent.click(screen.getByRole('button', { name: /50\/50/ }))
    expect(onFifty).toHaveBeenCalledOnce()
    rerender(<HelperBar level={8} helpers={{ ...fresh, fifty_used: true, hidden: ['a', 'c'] }} question={mcq} onFifty={onFifty} />)
    expect(screen.getByRole('button', { name: /50\/50/ })).toBeDisabled()
  })

  it('shows whether Second Chance is ready', () => {
    const { rerender } = render(<HelperBar level={3} helpers={{ ...fresh, second_chance_left: true }} question={mcq} onFifty={vi.fn()} />)
    expect(screen.getByText(/second chance ready/i)).toBeTruthy()
    rerender(<HelperBar level={3} helpers={fresh} question={mcq} onFifty={vi.fn()} />)
    expect(screen.getByText(/second chance used/i)).toBeTruthy()
    rerender(<HelperBar level={2} helpers={fresh} question={mcq} onFifty={vi.fn()} />)
    expect(screen.getByText(/level 3/i)).toBeTruthy()
  })
})
