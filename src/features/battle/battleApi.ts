import { supabase } from '../../services/supabase'
import type { BossId, MonsterKind } from '../../game/map'
import type { PublicQuestion } from './questionSchema'

/** Battle helpers as the server reports them (the server decides everything). */
export type Helpers = { second_chance_left: boolean; fifty_used: boolean; hidden: string[] }

export type EncounterState = {
  encounter_id: string
  monster_id: MonsterKind
  monster_hp: number
  monster_max_hp: number
  player_hp: number
  combo: number
  status: 'active' | 'won' | 'lost' | 'fled'
  helpers: Helpers
  question: PublicQuestion | null
  /** A Returning battle: due topics come back (spaced review). */
  returning?: boolean
  /** The pet's random guess on this question (choice questions, sometimes). */
  pet_guess?: string | null
}

export type AnswerResult = {
  correct: boolean
  correct_answer: string | string[] | Record<string, string> | { value: number; tolerance: number; unit?: string } | { accept: string[] }
  explanation: string
  wrong_reason: string | null
  damage: number
  farmed: boolean
  xp_gained: number
  gold_gained: number
  bonus: { xp: number; gold: number }
  totals: { xp: number; level: number; gold: number }
  leveled_up: boolean
  second_chance: boolean
  missions_completed: string[]
  /** Paid on winning a Returning battle. */
  returning_bonus?: { xp: number; gold: number } | null
  /** 'taught' when the player was right over the pet's wrong guess; 'both' when both were right. */
  pet?: 'taught' | 'both' | null
  state: EncounterState
}

export type AnswerPayload = { choice: string } | { value: string } | { text: string } | { choices: string[] } | { order: string[] } | { pairs: Record<string, string> }

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
  new BattleError(
    /too fast/i.test(message ?? '') ? 'battle.errors.tooFast'
    : /no questions/i.test(message ?? '') ? 'battle.errors.noQuestions'
    : /reach level \d+ to challenge/i.test(message ?? '') ? 'battle.errors.bossLevel'
    : /50\/50/i.test(message ?? '') ? 'battle.helpers.fiftyFailed'
    : /nothing is due/i.test(message ?? '') ? 'review.nothingDue'
    : /time's up/i.test(message ?? '') ? 'parents.timeUp'
    : 'battle.errors.generic',
  )

export async function startEncounter(monster: MonsterKind, returning = false): Promise<EncounterState> {
  const { data, error } = await supabase!.rpc('start_encounter', { p_monster: monster, p_returning: returning })
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
  boss_id: BossId
  round: number
  rounds: number
  round_progress: number
  per_round: number
  hearts: number
  status: 'active' | 'won' | 'lost' | 'fled'
  helpers: Helpers
  question: PublicQuestion | null
}
export type BossResult = Pick<AnswerResult, 'correct' | 'correct_answer' | 'explanation' | 'wrong_reason' | 'missions_completed' | 'totals' | 'second_chance'> & {
  reward: { xp: number; gold: number; already_today: boolean; leveled_up: boolean } | null
  state: BossState
}

export async function startBoss(boss: BossId = 'guardian'): Promise<BossState> {
  const { data, error } = await supabase!.rpc('start_boss', { p_boss: boss })
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

/** 50/50: the server hides two wrong options of the current question (level 8, once per battle). */
export async function askFifty(encounterId: string): Promise<{ hidden: string[] }> {
  const { data, error } = await supabase!.rpc('use_fifty', { p_encounter: encounterId })
  if (error) throw toBattleError(error.message)
  return data as { hidden: string[] }
}

export async function askBossFifty(runId: string): Promise<{ hidden: string[] }> {
  const { data, error } = await supabase!.rpc('use_boss_fifty', { p_run: runId })
  if (error) throw toBattleError(error.message)
  return data as { hidden: string[] }
}
