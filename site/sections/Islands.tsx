import { BookA, Calculator, Cpu, Home, TreePalm } from 'lucide-react'
import type { SiteCopy } from '../App'
import { card, Section } from './Section'

const ISLANDS = [
  { key: 'greenhaven', Icon: Home, colour: 'from-[#c5e8a0] to-[#8bc34a]' },
  { key: 'science', Icon: TreePalm, colour: 'from-[#a8e6cf] to-[#3e9e6e]' },
  { key: 'maths', Icon: Calculator, colour: 'from-[#ffe0a3] to-[#e0a85b]' },
  { key: 'tech', Icon: Cpu, colour: 'from-[#c9c3ff] to-[#7c6fd6]' },
  { key: 'language', Icon: BookA, colour: 'from-[#ffc9c9] to-[#e57373]' },
] as const

export function Islands({ t }: { t: SiteCopy }) {
  return (
    <Section id="islands" title={t.islands.title} tint="bg-water/30">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ISLANDS.map(({ key, Icon, colour }) => (
          <li key={key} className={`${card} overflow-hidden`}>
            <div className={`grid h-24 place-items-center bg-gradient-to-b ${colour}`}>
              <Icon size={44} className="text-cream drop-shadow-[0_3px_0_var(--color-wood-dark)]" aria-hidden />
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg font-bold">{t.islands.list[key].name}</h3>
              <p className="mt-1 text-sm">{t.islands.list[key].line}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
