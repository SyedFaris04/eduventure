import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Shrinks its content, just enough, when it is taller than the space it has (a phone with a larger font or display
 * size, status bars, a short browser window), so the screen never scrolls. Content that fits stays at full size.
 * The box needs a height from its parent (for example flex-1 in a full-height column).
 */
export function FitToScreen({ children, className = '', center = false }: { children: ReactNode; className?: string; center?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, need: 0 })
  const { scale, need: needed } = fit

  useLayoutEffect(() => {
    const fit = () => {
      const have = box.current?.clientHeight ?? 0
      const need = content.current?.scrollHeight ?? 0 // a transform does not change this, so it is the full size
      setFit({ scale: have > 0 && need > have ? Math.floor((have / need) * 100) / 100 : 1, need })
    }
    fit()
    // Older Android WebViews have no ResizeObserver: follow the window instead (turning the phone, the bars hiding).
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', fit)
      return () => window.removeEventListener('resize', fit)
    }
    const watch = new ResizeObserver(fit)
    if (box.current) watch.observe(box.current)
    if (content.current) watch.observe(content.current)
    return () => watch.disconnect()
  }, [])

  return (
    // centre: content that fits sits in the middle; shrunk content starts at the top so none of it is cut off.
    <div ref={box} data-fit="box" className={`min-h-0 overflow-hidden ${center ? `flex flex-col ${scale < 1 ? 'justify-start' : 'justify-center'}` : ''} ${className}`}>
      {/* The negative margin gives back the space the shrink frees, so the box does not hold invisible overflow. */}
      <div
        ref={content}
        data-fit="content"
        style={{ transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: 'top center', marginBottom: scale < 1 ? -Math.ceil(needed * (1 - scale)) : undefined }}
      >
        {children}
      </div>
    </div>
  )
}
