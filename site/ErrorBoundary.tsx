import { Component, type ReactNode } from 'react'

/**
 * Shows a scene's still picture if its 3D fails: a chunk deleted by a newer deploy (a page left open), or a WebGL
 * context the device refuses. Without it React would blank the whole page, download buttons included.
 */
export class Fallback extends Component<{ still: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.still : this.props.children
  }
}
