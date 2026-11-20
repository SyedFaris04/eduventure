import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonsterStill, PetStill } from './Still'

describe('still pictures (no 3D)', () => {
  it('the monster flinches when it is hit', () => {
    const { rerender } = render(<MonsterStill hits={0} label="Sproutling" />)
    expect(screen.getByRole('img', { name: 'Sproutling' }).className).not.toMatch(/\bhit\b/)
    rerender(<MonsterStill hits={1} label="Sproutling" />)
    expect(screen.getByRole('img', { name: 'Sproutling' }).className).toMatch(/\bhit\b/)
  })

  it('the pet grows with each stage', () => {
    const size = (stage: 'egg' | 'baby' | 'young' | 'adult') => {
      const { unmount } = render(<PetStill stage={stage} label={stage} />)
      const px = parseFloat(screen.getByRole('img', { name: stage }).style.width)
      unmount()
      return px
    }
    const [egg, baby, young, adult] = (['egg', 'baby', 'young', 'adult'] as const).map(size)
    expect(baby).toBeGreaterThan(egg - 1)
    expect(young).toBeGreaterThan(baby)
    expect(adult).toBeGreaterThan(young)
  })
})
