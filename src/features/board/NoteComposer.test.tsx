import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { NoteComposer } from './NoteComposer'

const adult = { can_write: true, can_type: true, reason: null }
const child = { can_write: true, can_type: false, reason: null }

describe('NoteComposer', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('lets a player 13 or over pick a sticker, a phrase and type, with the characters left', () => {
    const onPost = vi.fn()
    render(<NoteComposer rights={adult} busy={false} onPost={onPost} />)
    const pin = screen.getByRole('button', { name: 'Pin' }) as HTMLButtonElement
    expect(pin.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Idea' }))
    fireEvent.change(screen.getByLabelText('Phrase'), { target: { value: 'p01' } })
    fireEvent.change(screen.getByLabelText('Your words (optional)'), { target: { value: 'Plants make oxygen' } })
    expect(screen.getByText('102 left')).toBeTruthy()
    fireEvent.click(pin)
    expect(onPost).toHaveBeenCalledWith({ sticker: 'idea', phrase: 'p01', body: 'Plants make oxygen' })
  })

  it('keeps the words when the server refuses the note, and clears them once pinned', async () => {
    const onPost = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    render(<NoteComposer rights={adult} busy={false} onPost={onPost} />)
    const box = screen.getByLabelText('Your words (optional)') as HTMLInputElement
    fireEvent.change(box, { target: { value: 'call me later' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }))
    await waitFor(() => expect(onPost).toHaveBeenCalledTimes(1))
    expect(box.value).toBe('call me later')
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }))
    await waitFor(() => expect(box.value).toBe(''))
  })

  it('gives under-13s stickers and phrases but no text box', () => {
    render(<NoteComposer rights={child} busy={false} onPost={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Star' })).toBeTruthy()
    expect(screen.queryByLabelText('Your words (optional)')).toBeNull()
  })

  it('says why a player cannot write instead of the pickers', () => {
    render(<NoteComposer rights={{ can_write: false, can_type: false, reason: 'parent_off' }} busy={false} onPost={vi.fn()} />)
    expect(screen.getByText('Your parent turned off writing on boards.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pin' })).toBeNull()
  })

  it('warns about text in another script before sending', () => {
    render(<NoteComposer rights={adult} busy={false} onPost={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Your words (optional)'), { target: { value: '你好' } })
    expect(screen.getByText(/only letters A–Z/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Pin' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
