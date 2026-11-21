import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

type Props = { selected?: boolean; onSelect?: () => void; className?: string; children: ReactNode }

/** Selectable card. With onSelect it is a toggle button; without, a static box. */
export function Card({ selected = false, onSelect, className = '', children }: Props) {
  const look = `relative rounded-2xl border-[3px] bg-white/80 p-4 text-start short:rounded-xl short:p-2.5 transition ${
    selected
      ? 'border-grass-dark bg-grass/15 shadow-[0_0_0_3px_var(--color-grass)]'
      : 'border-wood/50 shadow-[0_3px_0_rgb(92_58_36/0.35)]'
  } ${className}`

  if (!onSelect) return <div className={look}>{children}</div>

  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={`${look} hover:-translate-y-0.5 hover:border-wood`}>
      {selected && (
        <span aria-hidden className="absolute -top-3 -right-3 grid size-7 place-items-center rounded-full border-2 border-grass-dark bg-grass text-white">
          <Check size={16} strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  )
}
