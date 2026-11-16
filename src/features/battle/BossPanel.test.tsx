import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { BossLocked, bossLockedAt } from './BossPanel'

describe('island boss gate', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('island bosses wait for level 5; the Guardian never does', () => {
    expect(bossLockedAt('raja_rafflesia', 4)).toBe(5)
    expect(bossLockedAt('abacus_titan', 5)).toBeNull()
    expect(bossLockedAt('guardian', 1)).toBeNull()
  })

  it('a level-4 player at Raja Rafflesia sees the level message and no Fight button', () => {
    render(<BossLocked boss="raja_rafflesia" level={5} onClose={() => undefined} />)
    expect(screen.getByText(/reach level 5 to challenge/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /fight/i })).toBeNull()
    expect(screen.getByRole('button', { name: /back/i })).toBeTruthy()
  })
})
