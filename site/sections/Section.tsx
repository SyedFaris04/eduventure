import type { ReactNode } from 'react'

/** A page section with the game's wooden title tab. */
export function Section({ id, title, lead, children, tint = '' }: { id: string; title: string; lead?: string; children: ReactNode; tint?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`px-4 py-12 ${tint}`}>
      <div className="mx-auto max-w-6xl">
        <h2 id={`${id}-title`} className="mx-auto w-fit rounded-2xl border-[3px] border-wood-dark bg-wood px-5 py-1.5 text-center font-display text-2xl font-bold text-cream shadow-[0_4px_0_var(--color-wood-dark)] sm:text-3xl">
          {title}
        </h2>
        {lead && <p className="mx-auto mt-3 max-w-xl text-center text-lg font-semibold text-wood-dark">{lead}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  )
}

export const card = 'rounded-3xl border-4 border-wood bg-cream shadow-[0_6px_0_var(--color-wood-dark)]'
