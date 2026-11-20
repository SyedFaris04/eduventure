import { useEffect, useRef, useState } from 'react'
import { hasWebGL } from '../src/world3d/webgl'
import { should3D } from './should3D'

/** near: has come close to the screen once (start loading); visible: on screen now (keep drawing). */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [state, setState] = useState({ near: false, visible: false })
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return setState({ near: true, visible: true })
    const io = new IntersectionObserver(([e]) => setState((s) => ({ near: s.near || e.isIntersecting, visible: e.isIntersecting })), { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, ...state }
}

export const can3D = () =>
  should3D({ webgl: hasWebGL(), reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false })
