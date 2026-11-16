import { useEffect, useRef, useState } from 'react'
import type { OneShot } from './HeroModel'

/**
 * The hero's reaction to answers: a flinch for a wrong one, a cheer for a win. Counters already set when the
 * world opened belong to earlier visits and are ignored; when both change at once (a win after a mistake), the cheer plays.
 */
export function useLatestReaction(hitSeq: number, cheerSeq: number): OneShot | null {
  const seen = useRef({ hit: hitSeq, cheer: cheerSeq, n: 0 })
  const [shot, setShot] = useState<OneShot | null>(null)
  useEffect(() => {
    const s = seen.current
    const hit = hitSeq !== s.hit
    const cheer = cheerSeq !== s.cheer
    s.hit = hitSeq
    s.cheer = cheerSeq
    if (cheer) setShot({ action: 'cheer', seq: ++s.n })
    else if (hit) setShot({ action: 'hit', seq: ++s.n })
  }, [hitSeq, cheerSeq])
  return shot
}
