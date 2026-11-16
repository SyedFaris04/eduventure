export type HeroAction = 'idle' | 'walk' | 'run' | 'cheer' | 'hit' | 'wave' | 'attack'
export type LoopAction = 'idle' | 'walk' | 'run'

/** Rig clip per action (KayKit names; tests check each exists in rig.glb). */
export const CLIP: Record<HeroAction, string> = {
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  cheer: 'Cheer',
  hit: 'Hit_A',
  wave: 'Interact',
  attack: '1H_Melee_Attack_Chop',
}
export const ONE_SHOT = new Set<HeroAction>(['cheer', 'hit', 'wave', 'attack'])
export const CROSSFADE_S = 0.2

/** Movement speed as a fraction of full speed → the looping clip to show. */
export const pickLoop = (speed01: number): LoopAction => (speed01 <= 0.02 ? 'idle' : speed01 < 0.6 ? 'walk' : 'run')
