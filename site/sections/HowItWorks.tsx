import { useState } from 'react'
import { Map, PawPrint, Swords } from 'lucide-react'
import type { SiteCopy } from '../App'
import { card, Section } from './Section'

const CARDS = [
  { key: 'explore', Icon: Map, colour: 'from-[#b5e48c] to-grass' },
  { key: 'battle', Icon: Swords, colour: 'from-[#ffd59e] to-path-dark' },
  { key: 'pet', Icon: PawPrint, colour: 'from-[#bde0fe] to-water-dark' },
] as const

/** Three cards that flip (tap, or hover with a mouse) to say more. */
export function HowItWorks({ t }: { t: SiteCopy }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <Section id="how" title={t.how.title} lead={t.how.tap}>
      <div className="grid gap-5 md:grid-cols-3">
        {CARDS.map(({ key, Icon, colour }) => {
          const c = t.how.cards[key]
          const flipped = open === key
          return (
            <button key={key} type="button" aria-pressed={flipped} onClick={() => setOpen(flipped ? null : key)} className={`flip group h-64 text-start md:h-80 lg:h-72 ${flipped ? 'flipped' : ''}`}>
              <span className="flip-inner">
                <span className={`flip-face ${card} flex flex-col items-center justify-center gap-3 bg-gradient-to-b ${colour} p-6 text-center`}>
                  <Icon size={56} className="text-cream drop-shadow-[0_3px_0_var(--color-wood-dark)]" aria-hidden />
                  <span className="font-display text-2xl font-bold text-ink">{c.title}</span>
                  <span className="font-semibold text-ink/80">{c.front}</span>
                </span>
                <span className={`flip-face flip-back ${card} flex flex-col justify-center gap-2 p-6`}>
                  <span className="font-display text-xl font-bold text-wood-dark">{c.title}</span>
                  <span className="text-base leading-relaxed">{c.back}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}
