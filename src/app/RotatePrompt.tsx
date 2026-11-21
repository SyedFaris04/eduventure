import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { needsRotate } from './orientation'

const check = () =>
  needsRotate({ width: window.innerWidth, height: window.innerHeight, coarse: window.matchMedia?.('(pointer: coarse)').matches ?? false })

/** Phones held upright in a browser that won't lock landscape (iPhone Safari): ask the player to turn the phone. */
export function RotatePrompt() {
  const { t } = useTranslation()
  const [show, setShow] = useState(check)
  useEffect(() => {
    const update = () => setShow(check())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  if (!show) return null
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="rotate-title" className="fixed inset-0 z-[100] grid place-items-center bg-gradient-to-b from-[#8ed1ff] to-grass p-6 text-center">
      <div className="flex flex-col items-center gap-5">
        <div aria-hidden className="rotate-phone h-28 w-16 rounded-2xl border-[6px] border-wood-dark bg-cream shadow-[0_6px_0_var(--color-wood-dark)]">
          <span className="mx-auto mt-1 block h-1 w-5 rounded-full bg-wood-dark" />
        </div>
        <h2 id="rotate-title" className="font-display text-2xl font-bold text-wood-dark">{t('rotate.title')}</h2>
        <p className="max-w-xs font-semibold text-ink">{t('rotate.body')}</p>
      </div>
    </div>
  )
}
