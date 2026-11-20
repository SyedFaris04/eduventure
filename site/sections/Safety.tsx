import { Ban, MessageSquareHeart, ShieldCheck, Users } from 'lucide-react'
import type { SiteCopy } from '../App'
import { card, Section } from './Section'

const POINTS = [
  { key: 'parents', Icon: Users },
  { key: 'chat', Icon: MessageSquareHeart },
  { key: 'boards', Icon: ShieldCheck },
  { key: 'fair', Icon: Ban },
] as const

export function Safety({ t }: { t: SiteCopy }) {
  return (
    <Section id="safety" title={t.safety.title} lead={t.safety.lead}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {POINTS.map(({ key, Icon }) => (
          <li key={key} className={`${card} flex items-start gap-3 p-5`}>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-grass/30 text-grass-dark">
              <Icon aria-hidden />
            </span>
            <p className="font-semibold">{t.safety.points[key]}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}
