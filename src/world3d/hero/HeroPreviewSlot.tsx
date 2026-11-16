import { Component, lazy, Suspense, type ReactNode } from 'react'
import type { Appearance } from '../../features/character/appearance'
import { hasWebGL } from '../webgl'

const HeroPreview = lazy(() => import('./HeroPreview'))

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * The creator's live 3D hero. Without WebGL, or if the model fails to load, the slot stays empty (still labelled),
 * so the player can always finish making a hero.
 */
export function HeroPreviewSlot({ appearance, facing = 'front', label, className = '' }: { appearance: Appearance; facing?: 'front' | 'back'; label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={className}>
      {hasWebGL() && (
        <Quiet>
          <Suspense fallback={null}>
            <HeroPreview appearance={appearance} facing={facing} />
          </Suspense>
        </Quiet>
      )}
    </div>
  )
}
