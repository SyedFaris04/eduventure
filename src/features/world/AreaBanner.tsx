import { useEffect, useState } from 'react'
import { useGame } from '../../game/store'

/** Shows the name of the area the player just walked into for a moment (place names stay in Malay in every language). */
export function AreaBanner() {
  const area = useGame((s) => s.area)
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    if (!area) return
    setShown(area)
    const id = window.setTimeout(() => setShown(null), 2500)
    return () => window.clearTimeout(id)
  }, [area])

  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center px-4">
      {shown && (
        <p data-area-banner className="rise-in rounded-2xl border-[3px] border-wood bg-cream/95 px-5 py-1.5 font-display text-2xl font-bold text-wood-dark shadow-[0_4px_0_var(--color-wood-dark)]">
          {shown}
        </p>
      )}
    </div>
  )
}
