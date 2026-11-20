import type { Material } from '../../game/map'

export type Cost = Partial<Record<Material, number>>

/** Whether the player has every material a cost asks for (display only; the server checks again). */
export const canAfford = (cost: Cost, have: Record<Material, number> | undefined) =>
  Boolean(have) && Object.entries(cost).every(([m, n]) => (have![m as Material] ?? 0) >= (n ?? 0))

/** How much of one material a "Give" button hands to a camp project. */
export const giveAmount = (have: number, need: number, given: number) => Math.max(0, Math.min(have, need - given))
