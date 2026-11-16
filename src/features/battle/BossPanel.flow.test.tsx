import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'

const progression = vi.hoisted(() => ({ value: { data: undefined as { xp: number; level: number; gold: number } | undefined, isError: false } }))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('../character/useCharacter', () => ({ useProgression: () => progression.value }))
vi.mock('./BattlePanel', async (orig) => ({ ...(await orig<object>()), useProgressRefresh: () => ({ setTotals: () => undefined, refreshAll: async () => undefined }) }))
const startBoss = vi.hoisted(() => vi.fn())
vi.mock('./battleApi', async (orig) => ({ ...(await orig<object>()), startBoss }))

const { BossPanel } = await import('./BossPanel')

const run = (boss_id: string) => ({ run_id: 'r', boss_id, round: 1, rounds: 4, round_progress: 0, per_round: 3, hearts: 3, status: 'active', helpers: { second_chance_left: false, fifty_used: false, hidden: [] }, question: null })

describe('BossPanel flow', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    useGame.setState({ boss: null })
    startBoss.mockReset()
  })

  it('never traps the player when their level cannot load', () => {
    progression.value = { data: undefined, isError: true }
    useGame.setState({ boss: 'raja_rafflesia' })
    render(<BossPanel />)
    // Something with a way out is on screen (the lock notice here; the server still decides on a fight).
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: /back to the village/i })).toBeTruthy()
  })

  it("shows the boss the server actually resumed, not the one the player walked up to", async () => {
    progression.value = { data: { xp: 9999, level: 9, gold: 0 }, isError: false }
    startBoss.mockResolvedValue(run('guardian'))
    useGame.setState({ boss: 'raja_rafflesia' })
    render(<BossPanel />)
    expect(await screen.findByRole('dialog', { name: /Greenhaven Guardian/ })).toBeTruthy()
  })
})
