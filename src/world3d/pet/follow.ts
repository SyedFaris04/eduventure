type P = { x: number; y: number }
const BEHIND = 0.9 // tiles behind the hero
const SNAP = 4 // further than this (a boat ride, a new island) and the pet just appears beside the hero

/** One frame of the pet trotting after the hero: it aims for a spot just behind them and eases toward it. */
export function followStep(pet: P, hero: P, facing: number, dt: number): P {
  const target = { x: hero.x - Math.sin(facing) * BEHIND, y: hero.y - Math.cos(facing) * BEHIND }
  if (Math.hypot(pet.x - hero.x, pet.y - hero.y) > SNAP) return target
  const k = Math.min(1, dt * 4)
  return { x: pet.x + (target.x - pet.x) * k, y: pet.y + (target.y - pet.y) * k }
}
