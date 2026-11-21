import { useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props<T> = {
  items: T[]
  /** Items per page; Infinity shows them all with no controls (tall screens). */
  perPage: number
  /** Accessible name of the paged area. */
  label: string
  children: (item: T, index: number) => ReactNode
  /** Classes for the box that holds one page of items (a grid, a flex row…). */
  className?: string
  /** Render the page as a <ul> (children are then <li>). */
  list?: boolean
  /** Extra attributes for the box that holds the items (e.g. role="listbox" and its label). */
  boxProps?: HTMLAttributes<HTMLElement>
}

/**
 * One page of a list at a time, with ‹ › arrows, dots and swipe, so short phone screens never scroll. A list that
 * fits shows as is. The page stays valid when the list shrinks (a search narrowed it).
 */
export function Paged<T>({ items, perPage, label, children, className = '', list = false, boxProps }: Props<T>) {
  const { t } = useTranslation()
  const [wanted, setPage] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const pages = Number.isFinite(perPage) ? Math.max(1, Math.ceil(items.length / perPage)) : 1
  const page = Math.min(wanted, pages - 1)
  const shown = pages > 1 ? items.slice(page * perPage, (page + 1) * perPage) : items
  const go = (p: number) => setPage(Math.max(0, Math.min(pages - 1, p)))

  return (
    <section
      aria-label={label}
      className="flex min-h-0 flex-col gap-2"
      onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const s = start.current
        start.current = null
        if (!s || pages < 2) return
        const dx = e.clientX - s.x
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(page + (dx < 0 ? 1 : -1))
      }}
    >
      {list ? (
        <ul {...boxProps} className={className}>{shown.map((item, i) => children(item, page * perPage + i))}</ul>
      ) : (
        <div {...boxProps} className={className}>{shown.map((item, i) => children(item, page * perPage + i))}</div>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label={label}>
          <button type="button" aria-label={t('common.prevPage')} disabled={page === 0} onClick={() => go(page - 1)} className="grid size-9 place-items-center rounded-full border-2 border-wood bg-cream text-wood-dark disabled:opacity-35">
            <ChevronLeft size={18} className="rtl:rotate-180" aria-hidden />
          </button>
          {Array.from({ length: pages }, (_, p) => (
            <button
              key={p}
              type="button"
              aria-label={t('common.pageOf', { n: p + 1, total: pages })}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => go(p)}
              className="grid size-6 place-items-center"
            >
              <span className={`block h-2.5 rounded-full transition-all ${p === page ? 'w-6 bg-gold ring-2 ring-wood-dark' : 'w-2.5 bg-wood/40'}`} />
            </button>
          ))}
          <span className="sr-only" aria-live="polite">
            {t('common.pageOf', { n: page + 1, total: pages })}
          </span>
          <button type="button" aria-label={t('common.nextPage')} disabled={page === pages - 1} onClick={() => go(page + 1)} className="grid size-9 place-items-center rounded-full border-2 border-wood bg-cream text-wood-dark disabled:opacity-35">
            <ChevronRight size={18} className="rtl:rotate-180" aria-hidden />
          </button>
        </nav>
      )}
    </section>
  )
}
