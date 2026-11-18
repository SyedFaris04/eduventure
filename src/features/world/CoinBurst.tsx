import { playSfx } from '../../audio/engine'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Coins } from 'lucide-react'
import { useGame } from '../../game/store'
import { screenOf } from '../../game/screen'
import type { Point } from '../../game/iso'

const COINS = 8
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Pulses the HUD gold counter; the gold itself always comes from the server totals. */
const pulseGold = () => document.querySelector<HTMLElement>('[data-hud-gold]')?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' })

/**
 * After a won battle, coins pop out of the defeated monster and fly to the gold counter. Decoration only,
 * and it waits for the battle panel to close so the player actually sees it.
 */
export function CoinBurst() {
  const [burst, setBurst] = useState<{ from: Point; key: number } | null>(null)
  const pending = useRef<Point[]>([])

  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        const fresh = s.defeated.filter((id) => !prev.defeated.includes(id))
        for (const id of fresh) {
          const m = prev.monsters.find((x) => x.id === id) ?? s.monsters.find((x) => x.id === id)
          if (m) pending.current.push({ x: m.x, y: m.y })
        }
        if (prev.battle && !s.battle && pending.current.length) {
          const at = pending.current.pop()!
          pending.current = []
          const from = screenOf.current?.(at)
          if (!from) return
          playSfx('coin')
          if (reduced()) pulseGold()
          else setBurst({ from, key: Date.now() })
        }
      }),
    [],
  )

  if (!burst) return null
  return <Burst key={burst.key} from={burst.from} onDone={() => setBurst(null)} />
}

function Burst({ from, onDone }: { from: Point; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const gold = document.querySelector('[data-hud-gold]')?.getBoundingClientRect()
    const to = gold ? { x: gold.left + gold.width / 2, y: gold.top + gold.height / 2 } : { x: from.x, y: from.y - 120 }
    const coins = [...(ref.current?.querySelectorAll<HTMLElement>('[data-coin]') ?? [])]
    coins.forEach((el, i) => {
      // Each coin pops up and outward first, then curves into the counter.
      const a = (i / COINS) * Math.PI * 2
      const pop = { x: from.x + Math.cos(a) * 36, y: from.y - 30 + Math.sin(a) * 18 }
      el.animate?.(
        [
          { transform: `translate(${from.x}px, ${from.y}px) scale(0.4)`, opacity: 0 },
          { transform: `translate(${pop.x}px, ${pop.y}px) scale(1)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${to.x}px, ${to.y}px) scale(0.7)`, opacity: 1, offset: 0.95 },
          { transform: `translate(${to.x}px, ${to.y}px) scale(0.5)`, opacity: 0 },
        ],
        { duration: 750, delay: i * 45, easing: 'cubic-bezier(0.5, 0, 0.6, 1)', fill: 'both' },
      )
    })
    const pulse = setTimeout(pulseGold, 750)
    const done = setTimeout(onDone, 750 + COINS * 45 + 50)
    return () => {
      clearTimeout(pulse)
      clearTimeout(done)
    }
  }, [from, onDone])

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-20">
      {Array.from({ length: COINS }, (_, i) => (
        <span key={i} data-coin className="absolute -start-3 -top-3 text-gold drop-shadow-[0_2px_0_var(--color-wood-dark)]" style={{ transform: `translate(${from.x}px, ${from.y}px)` }}>
          <Coins size={24} strokeWidth={2.5} />
        </span>
      ))}
    </div>
  )
}
