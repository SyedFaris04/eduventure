import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import type { Pet } from './petRules'
import { PetGuess } from './PetGuess'
import { AdventureCard } from './AdventureCard'

const pet: Pet = { species: 'kancil', name: 'comel', stage: 'baby', form: null, points: 3, branches: { science: 0, maths: 0, technology: 0, language: 0 }, look: {} }

describe('PetGuess', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it("shows the pet's guess before the answer", () => {
    render(<PetGuess pet={pet} guess="Venus" result={null} />)
    expect(screen.getByText('Comel thinks it’s “Venus”. Is Comel right?')).toBeTruthy()
  })

  it('thanks the player for teaching, or celebrates together', () => {
    const { rerender } = render(<PetGuess pet={pet} guess="Venus" result="taught" />)
    expect(screen.getByText('You taught Comel! +2 pet points')).toBeTruthy()
    rerender(<PetGuess pet={pet} guess="Mercury" result="both" />)
    expect(screen.getByText('You and Comel both got it!')).toBeTruthy()
  })

  it('stays quiet without a pet or a guess', () => {
    const { container, rerender } = render(<PetGuess pet={null} guess="Venus" result={null} />)
    expect(container.textContent).toBe('')
    rerender(<PetGuess pet={pet} guess={null} result={null} />)
    expect(container.textContent).toBe('')
  })
})

describe('AdventureCard', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('away: where the pet is exploring', () => {
    render(<AdventureCard pet={pet} adventure={{ status: 'away', island: 'science_island', returns_at: '2099-01-01T12:00:00Z' }} souvenir={null} busy={false} onClaim={vi.fn()} />)
    expect(screen.getByText(/Comel is exploring Science Island/)).toBeTruthy()
  })

  it('back: open the souvenir, then read the fun fact', () => {
    const onClaim = vi.fn()
    const { rerender } = render(<AdventureCard pet={pet} adventure={{ status: 'back', island: 'science_island', returns_at: '2020-01-01T00:00:00Z' }} souvenir={null} busy={false} onClaim={onClaim} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open souvenir' }))
    expect(onClaim).toHaveBeenCalled()
    rerender(<AdventureCard pet={pet} adventure={{ status: 'none' }} souvenir={{ id: 'kinabalu', en: 'Mount Kinabalu is tall.', ms: 'Gunung Kinabalu tinggi.', island: 'science_island', points: 10 }} busy={false} onClaim={onClaim} />)
    expect(screen.getByText('Mount Kinabalu is tall.')).toBeTruthy()
    expect(screen.getByText('+10 pet points')).toBeTruthy()
  })

  it('nothing to show: empty', () => {
    const { container } = render(<AdventureCard pet={pet} adventure={{ status: 'none' }} souvenir={null} busy={false} onClaim={vi.fn()} />)
    expect(container.textContent).toBe('')
  })
})
