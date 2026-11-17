import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { PetCheer } from '../pet/PetCheer'
import type { Pet } from '../pet/petRules'
import { PetCorner } from './PetCorner'

const pet: Pet = { species: 'naga', name: 'comel', stage: 'baby', form: null, points: 3, branches: { science: 0, maths: 0, technology: 0, language: 0 }, look: { neck: 'pet_bell' } }
const corner = (props: Partial<React.ComponentProps<typeof PetCorner>>) => {
  const all = { pet, owned: new Set<string>(), level: 1, gold: 70, busy: false, onBuy: vi.fn(), onWear: vi.fn(), ...props }
  render(<PetCorner {...all} />)
  return all
}

describe('PetCorner', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('lists the eight pet items under its own heading', () => {
    corner({})
    expect(screen.getByRole('heading', { name: 'Pet corner' })).toBeTruthy()
    expect(screen.getAllByTestId(/^item-pet_/)).toHaveLength(8)
  })

  it('asks for a pet before trying items on', () => {
    corner({ pet: null })
    expect(screen.getByText('Hatch a pet to try this on')).toBeTruthy()
  })

  it('buys what the player can afford, locks rare items by level', () => {
    const v = corner({ pet: { ...pet, look: {} } })
    fireEvent.click(screen.getByRole('button', { name: /buy bell collar/i }))
    expect(v.onBuy).toHaveBeenCalledWith(expect.objectContaining({ id: 'pet_bell' }))
    expect(screen.getByTestId('item-pet_tengkolok').textContent).toMatch(/level 5/i)
    expect((screen.getByRole('button', { name: /buy batik scarf/i }) as HTMLButtonElement).disabled).toBe(true) // 80 gold, has 70
  })

  it('puts owned items on the pet', () => {
    const v = corner({ owned: new Set(['pet_bell', 'pet_flower']) })
    expect(screen.getByTestId('item-pet_bell').textContent).toMatch(/wearing/i)
    fireEvent.click(screen.getByRole('button', { name: /wear flower crown/i }))
    expect(v.onWear).toHaveBeenCalledWith(expect.objectContaining({ id: 'pet_flower' }))
  })
})

describe('PetCheer', () => {
  it('cheers by name after a wrong answer, and is silent without a pet', () => {
    const { container, rerender } = render(<PetCheer pet={pet} />)
    expect(screen.getByText("Comel: We'll get it next time!")).toBeTruthy()
    rerender(<PetCheer pet={null} />)
    expect(container.textContent).toBe('')
  })
})
