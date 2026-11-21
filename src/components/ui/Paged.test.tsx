import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { Paged } from './Paged'

const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`)
const list = (perPage: number, xs = items) => (
  <Paged items={xs} perPage={perPage} label="Things">
    {(x) => <span key={x}>{x}</span>}
  </Paged>
)

describe('Paged', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('shows everything and no controls when the items fit', () => {
    render(list(Infinity))
    expect(screen.getAllByText(/^Item/)).toHaveLength(10)
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull()
  })

  it('shows one page at a time with arrows and "Page n of m"', () => {
    render(list(4))
    expect(screen.getAllByText(/^Item/).map((e) => e.textContent)).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4'])
    expect(screen.getByText('Page 1 of 3')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getAllByText(/^Item/).map((e) => e.textContent)).toEqual(['Item 9', 'Item 10'])
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('a dot jumps straight to its page', () => {
    render(list(4))
    fireEvent.click(screen.getByRole('button', { name: 'Page 2 of 3' }))
    expect(screen.getByText('Item 5')).toBeTruthy()
  })

  it('a swipe left or right turns the page', () => {
    render(list(4))
    const area = screen.getByRole('region', { name: 'Things' })
    fireEvent.pointerDown(area, { clientX: 300, clientY: 10 })
    fireEvent.pointerUp(area, { clientX: 200, clientY: 14 })
    expect(screen.getByText('Item 5')).toBeTruthy()
    fireEvent.pointerDown(area, { clientX: 100, clientY: 10 })
    fireEvent.pointerUp(area, { clientX: 220, clientY: 10 })
    expect(screen.getByText('Item 1')).toBeTruthy()
  })

  it('stays on a real page when the list shrinks (a search narrowed it)', () => {
    const { rerender } = render(list(4))
    fireEvent.click(screen.getByRole('button', { name: 'Page 3 of 3' }))
    rerender(list(4, items.slice(0, 3)))
    expect(screen.getAllByText(/^Item/)).toHaveLength(3)
  })
})
