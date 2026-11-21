import { useSyncExternalStore } from 'react'

/** The same test as the CSS `short` variant (src/styles/index.css): a phone held sideways. */
export const SHORT_QUERY = '(orientation: landscape) and (max-height: 500px)'

const query = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(SHORT_QUERY) : null)

function subscribe(onChange: () => void) {
  const q = query()
  q?.addEventListener('change', onChange)
  return () => q?.removeEventListener('change', onChange)
}

/** True on short, wide screens, for the few places where the structure (not just sizes) changes. */
export function useShortScreen(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false, () => false)
}
