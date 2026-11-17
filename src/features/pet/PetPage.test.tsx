import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { initI18n } from '../../i18n'
import { PetView } from './PetPage'
import type { Pet } from './petRules'

const pet = (p: Partial<Pet>): Pet => ({ species: 'kancil', name: 'comel', stage: 'baby', form: null, points: 0, branches: { science: 0, maths: 0, technology: 0, language: 0 }, look: {}, ...p })
const view = (props: Partial<React.ComponentProps<typeof PetView>>) => {
  const all = { level: 1, gold: 0, pet: null, owned: new Set<string>(), busy: false, onHatch: vi.fn(), onEvolve: vi.fn(), onDress: vi.fn(), ...props }
  render(
    <MemoryRouter>
      <PetView {...all} />
    </MemoryRouter>,
  )
  return all
}

describe('PetView', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('PetPage shows the egg lock at level 1', () => {
    view({ level: 1 })
    expect(screen.getByText('Reach level 2 to hatch your egg')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /hatch/i })).toBeNull()
  })

  it('hatches the chosen egg with the chosen name', () => {
    const v = view({ level: 2 })
    expect(screen.getAllByRole('button', { pressed: false }).length + screen.getAllByRole('button', { pressed: true }).length).toBe(3)
    fireEvent.click(screen.getByRole('button', { name: /beruang/i }))
    fireEvent.change(screen.getByRole('combobox', { name: /name/i }), { target: { value: 'mochi' } })
    fireEvent.click(screen.getByRole('button', { name: /hatch/i }))
    expect(v.onHatch).toHaveBeenCalledWith('beruang', 'mochi')
  })

  it('shows what evolving still needs', () => {
    view({ level: 3, gold: 20, pet: pet({ points: 40 }) })
    expect(screen.getByText('40 / 100 pet points')).toBeTruthy()
    expect((screen.getByRole('button', { name: /evolve/i }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getAllByRole('listitem').filter((li) => li.dataset.ok === 'false')).toHaveLength(3)
  })

  it('evolves when every gate is met', () => {
    const v = view({ level: 5, gold: 60, pet: pet({ points: 100 }) })
    const button = screen.getByRole('button', { name: /evolve/i }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    expect(v.onEvolve).toHaveBeenCalled()
  })

  it('shows the subject bars and the form the pet is heading for', () => {
    view({ level: 6, pet: pet({ stage: 'young', points: 150, branches: { science: 10, maths: 60, technology: 5, language: 5 } }) })
    expect(screen.getByText('Heading for: Maths form')).toBeTruthy()
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(5)
  })

  it('dresses the pet with owned items only', () => {
    const v = view({ level: 3, pet: pet({ look: { neck: 'pet_bell' } }), owned: new Set(['pet_bell', 'pet_flower', 'wizard_hat']) })
    fireEvent.click(screen.getByRole('button', { name: /wear flower crown/i }))
    expect(v.onDress).toHaveBeenCalledWith('hat', 'pet_flower')
    fireEvent.click(screen.getByRole('button', { name: /take off bell collar/i }))
    expect(v.onDress).toHaveBeenLastCalledWith('neck', null)
    expect(screen.queryByText(/wizard hat/i)).toBeNull()
  })
})
