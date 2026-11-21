import { describe, expect, it } from 'vitest'
import { backAction, type BackState } from './backButton'

const idle: BackState = { battle: null, boss: null, playerCard: null, settings: false, board: false, workbench: false, jetty: false, dialogue: null }

describe('Android back button', () => {
  it('does nothing during a battle or boss fight, so a question cannot be skipped', () => {
    expect(backAction({ ...idle, battle: { monsterId: 'm1' } as never, settings: true }, '/world')).toBe('ignore')
    expect(backAction({ ...idle, boss: 'b1' as never }, '/world')).toBe('ignore')
  })

  it('closes the top panel first', () => {
    expect(backAction({ ...idle, settings: true, board: true }, '/world')).toEqual({ patch: { settings: false } })
    expect(backAction({ ...idle, board: true }, '/world')).toEqual({ patch: { board: false } })
    expect(backAction({ ...idle, workbench: true }, '/world')).toEqual({ patch: { workbench: false } })
    expect(backAction({ ...idle, playerCard: 'p1', dialogue: { npc: 'elder', page: 0 } as never }, '/world')).toEqual({ patch: { playerCard: null } })
  })

  it('goes back a page, and leaves the app from the welcome or home page', () => {
    expect(backAction(idle, '/world')).toBe('back')
    expect(backAction(idle, '/shop')).toBe('back')
    expect(backAction(idle, '/home')).toBe('exit')
    expect(backAction(idle, '/welcome')).toBe('exit')
    expect(backAction(idle, '/')).toBe('exit')
  })
})
