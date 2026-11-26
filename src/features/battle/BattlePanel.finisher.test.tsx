import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'
import type { PublicQuestion } from './questionSchema'

vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('../character/useCharacter', () => ({ useProgression: () => ({ data: { xp: 0, level: 1, gold: 0 }, isError: false }) }))
vi.mock('../../world3d/SnapshotImage', () => ({ Snapshot: () => null }))
vi.mock('../pet/BattlePetGuess', () => ({ BattlePetGuess: () => null }))
vi.mock('../pet/PetCheer', () => ({ MyPetCheer: () => null }))
vi.mock('../../audio/engine', () => ({ playSfx: () => undefined }))
const api = vi.hoisted(() => ({ startEncounter: vi.fn(), answerQuestion: vi.fn() }))
vi.mock('./battleApi', async (orig) => ({ ...(await orig<object>()), ...api }))

const { BattlePanel } = await import('./BattlePanel')

const question = { id: 'q', type: 'true_false', prompt: 'True or false: 2 is even.', difficulty: 1, subject: 'mathematics', status: 'published' } as unknown as PublicQuestion
const enc = { encounter_id: 'e', monster_id: 'sproutling', monster_hp: 20, monster_max_hp: 55, player_hp: 100, combo: 1, status: 'active', helpers: { second_chance_left: false, fifty_used: false, hidden: [] }, question }
const win = { correct: true, correct_answer: 'true', explanation: '', wrong_reason: null, damage: 20, farmed: false, xp_gained: 25, gold_gained: 5, bonus: { xp: 20, gold: 3 }, totals: { xp: 25, level: 1, gold: 5 }, leveled_up: false, second_chance: false, missions_completed: [], state: { ...enc, monster_hp: 0, status: 'won', question: null } }

const reducedMotion = (on: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q.includes('reduce'), media: q, addEventListener: () => undefined, removeEventListener: () => undefined }))

async function winBattle() {
  api.startEncounter.mockResolvedValue(enc)
  api.answerQuestion.mockResolvedValue(win)
  useGame.setState({ battle: { monsterId: 'sproutling-0', monster: 'sproutling' }, finisher: null, defeated: [] })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BattlePanel />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: /True/ }))
  expect(await screen.findByText(/Correct!/, undefined, { timeout: 4000 })).toBeTruthy() // the player sees their last answer land
}

describe('winning a battle', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    useGame.setState({ battle: null, finisher: null, defeated: [] })
  })

  it('hands the stage to the defeat cutscene, then shows the rewards', async () => {
    reducedMotion(false)
    await winBattle()
    await waitFor(() => expect(useGame.getState().finisher).toMatchObject({ monsterId: 'sproutling-0', name: 'Sproutling' }), { timeout: 3000 })
    expect(screen.queryByRole('dialog')).toBeNull() // the panel steps aside so the world can be seen
    expect(useGame.getState().defeated).toEqual([]) // the cutscene removes the monster at the blow
    useGame.setState({ finisher: null })
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Back to the village' }).length).toBeGreaterThan(0) // (two copies: phone and desktop layouts)
  }, 10_000)

  it('with reduced motion there is no cutscene: the monster just goes', async () => {
    reducedMotion(true)
    await winBattle()
    await waitFor(() => expect(useGame.getState().defeated).toEqual(['sproutling-0']))
    expect(useGame.getState().finisher).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
  }, 10_000)
})
