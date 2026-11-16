import { supabase } from '../../services/supabase'
import type { MonsterKind } from '../../game/map'
import type { PublicQuestion } from './questionSchema'

export type EncounterState = {
  encounter_id: string
  monster_id: MonsterKind
  monster_hp: number
  monster_max_hp: number
  player_hp: number
  combo: number
  status: 'active' | 'won' | 'lost' | 'fled'
  question: PublicQuestion | null
}

export type AnswerResult = {
  correct: boolean
  correct_answer: string | { value: number; tolerance: number; unit?: string } | { accept: string[] }
  explanation: string
  wrong_reason: string | null
  damage: number
  farmed: boolean
  xp_gained: number
  gold_gained: number
  bonus: { xp: number; gold: number }
  totals: { xp: number; level: number; gold: number }
  leveled_up: boolean
  missions_completed: string[]
  state: EncounterState
}

export type AnswerPayload = { choice: string } | { value: string } | { text: string }

/** Turns database errors into i18n keys for the battle panel. */
export class BattleError extends Error {
  constructor(public key: string) {
    super(key)
  }
}
const toBattleError = (message: string | undefined) => {
  if (import.meta.env.DEV) console.error('battle error:', message)
  return mapBattleError(message)
}
const mapBattleError = (message: string | undefined) =>
  new BattleError(/too fast/i.test(message ?? '') ? 'battle.errors.tooFast' : /no questions/i.test(message ?? '') ? 'battle.errors.noQuestions' : 'battle.errors.generic')

export async function startEncounter(monster: MonsterKind): Promise<EncounterState> {
  const { data, error } = await supabase!.rpc('start_encounter', { p_monster: monster })
  if (error) throw toBattleError(error.message)
  return data as EncounterState
}

export async function answerQuestion(encounterId: string, answer: AnswerPayload): Promise<AnswerResult> {
  const { data, error } = await supabase!.rpc('answer_question', { p_encounter: encounterId, p_answer: answer })
  if (error) throw toBattleError(error.message)
  return data as AnswerResult
}

export type BossState = {
  run_id: string
  round: number
  rounds: number
  round_progress: number
  per_round: number
  hearts: number
  status: 'active' | 'won' | 'lost' | 'fled'
  question: PublicQuestion | null
}
export type BossResult = Pick<AnswerResult, 'correct' | 'correct_answer' | 'explanation' | 'wrong_reason' | 'missions_completed' | 'totals'> & {
  reward: { xp: number; gold: number; already_today: boolean; leveled_up: boolean } | null
  state: BossState
}

export async function startBoss(): Promise<BossState> {
  const { data, error } = await supabase!.rpc('start_boss')
  if (error) throw toBattleError(error.message)
  return data as BossState
}

export async function answerBoss(runId: string, answer: AnswerPayload): Promise<BossResult> {
  const { data, error } = await supabase!.rpc('answer_boss', { p_run: runId, p_answer: answer })
  if (error) throw toBattleError(error.message)
  return data as BossResult
}

export async function fleeBoss(runId: string): Promise<void> {
  const { error } = await supabase!.rpc('flee_boss', { p_run: runId })
  if (error) throw toBattleError(error.message)
}

export async function fleeEncounter(encounterId: string): Promise<void> {
  const { error } = await supabase!.rpc('flee_encounter', { p_encounter: encounterId })
  if (error) throw toBattleError(error.message)
}
