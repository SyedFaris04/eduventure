import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { needsRotate, screenNow } from './orientation'

/**
 * Phones held upright in a browser that won't lock landscape (iPhone Safari): ask the player to turn the phone.
 * `path` is the current route; parent, teacher, admin and sign-in pages stay usable upright.
 */
export function RotatePrompt({ path }: { path: string }) {
  const { t } = useTranslation()
  const [screen, setScreen] = useState(screenNow)
  useEffect(() => {
    const update = () => setScreen(screenNow())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  const show = needsRotate(screen, path)
  // Keep screen readers and taps off the game behind the prompt.
  useEffect(() => {
    const app = document.getElementById('root')?.firstElementChild as HTMLElement | null
    if (!app || !show) return
    app.inert = true
    return () => {
      app.inert = false
    }
  }, [show])
  if (!show) return null
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="rotate-title" aria-describedby="rotate-body" className="fixed inset-0 z-[100] grid place-items-center bg-gradient-to-b from-[#8ed1ff] to-grass p-6 text-center">
      <div className="flex flex-col items-center gap-5">
        <div aria-hidden className="rotate-phone h-28 w-16 rounded-2xl border-[6px] border-wood-dark bg-cream shadow-[0_6px_0_var(--color-wood-dark)]">
          <span className="mx-auto mt-1 block h-1 w-5 rounded-full bg-wood-dark" />
        </div>
        <h2 id="rotate-title" className="font-display text-2xl font-bold text-wood-dark">{t('rotate.title')}</h2>
        <p id="rotate-body" className="max-w-xs font-semibold text-ink">{t('rotate.body')}</p>
      </div>
    </div>
  )
}
