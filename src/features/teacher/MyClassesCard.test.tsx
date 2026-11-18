import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { MyClassesCard, type StudentClass } from './MyClassesCard'

const classes: StudentClass[] = [
  { class_id: 'c1', name: '6 Bestari', school: 'SK Taman', quests: [{ id: 'q1', subject: 'mathematics', topic: 'Fractions', tp: null, target: 10, due_on: '2099-01-01', island: 'mathematics_mountains', progress: 4 }] },
]

describe('MyClassesCard', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('under 18 without a parent: asks for approval before joining', () => {
    render(<MyClassesCard classes={[]} canJoin={false} busy={false} onJoin={vi.fn()} onLeave={vi.fn()} />)
    expect(screen.getByText(/a parent must approve your account before you can join a class/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Join' })).toBeNull()
  })

  it('joins with a class code', () => {
    const onJoin = vi.fn()
    render(<MyClassesCard classes={[]} canJoin busy={false} onJoin={onJoin} onLeave={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Class code'), { target: { value: 'abcd-ef23' } })
    fireEvent.click(screen.getByRole('button', { name: 'Join' }))
    expect(onJoin).toHaveBeenCalledWith('abcd-ef23')
  })

  it('shows quests with progress and where to find them', () => {
    const onLeave = vi.fn()
    render(<MyClassesCard classes={classes} canJoin busy={false} onJoin={vi.fn()} onLeave={onLeave} />)
    expect(screen.getByText('6 Bestari')).toBeTruthy()
    expect(screen.getByText('Fractions')).toBeTruthy()
    expect(screen.getByText('4 / 10')).toBeTruthy()
    expect(screen.getByText(/Mathematics Mountains/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Leave 6 Bestari' }))
    expect(onLeave).toHaveBeenCalledWith('c1')
  })
})
