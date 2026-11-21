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

  it('goes back to page 1 when resetKey changes (a new search, filter or tab)', () => {
    const view = (key: string) => (
      <Paged items={items} perPage={4} label="Things" resetKey={key}>
        {(x) => <span key={x}>{x}</span>}
      </Paged>
    )
    const { rerender } = render(view('a'))
    fireEvent.click(screen.getByRole('button', { name: 'Page 3 of 3' }))
    expect(screen.getByText('Item 9')).toBeTruthy()
    rerender(view('b'))
    expect(screen.getByText('Item 1')).toBeTruthy()
  })

  it('lets the page pan sideways on touch screens and ignores a cancelled swipe', () => {
    render(list(4))
    const area = screen.getByRole('region', { name: 'Things' })
    expect(area.className).toContain('touch-pan-y') // the browser hands horizontal swipes to us instead of cancelling them
    fireEvent.pointerDown(area, { clientX: 300, clientY: 10 })
    fireEvent.pointerCancel(area)
    fireEvent.pointerUp(area, { clientX: 100, clientY: 10 })
    expect(screen.getByText('Item 1')).toBeTruthy()
  })

  it('names the page controls apart from the list', () => {
    render(list(4))
    expect(screen.getByRole('navigation', { name: 'Pages: Things' })).toBeTruthy()
  })

  it('gives each item its index in the whole list, paged or not', () => {
    const seen: number[] = []
    const indexed = (perPage: number) => (
      <Paged items={items} perPage={perPage} label="Things">
        {(x, i) => {
          seen.push(i)
          return <span key={x}>{x}</span>
        }}
      </Paged>
    )
    render(indexed(Infinity))
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    seen.length = 0
    render(indexed(4))
    fireEvent.click(screen.getAllByRole('button', { name: 'Page 2 of 3' })[0])
    expect(seen.slice(-4)).toEqual([4, 5, 6, 7])
  })

  it('stays on a real page when the list shrinks (a search narrowed it)', () => {
    const { rerender } = render(list(4))
    fireEvent.click(screen.getByRole('button', { name: 'Page 3 of 3' }))
    rerender(list(4, items.slice(0, 3)))
    expect(screen.getAllByText(/^Item/)).toHaveLength(3)
  })
})
