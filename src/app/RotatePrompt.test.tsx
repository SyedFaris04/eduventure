import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { initI18n } from '../i18n'
import { useGame, worldPaused } from '../game/store'
import { RotatePrompt } from './RotatePrompt'

/** Fake a phone: a touch screen, held upright or sideways. */
function holdPhone(upright: boolean) {
  const [w, h] = upright ? [390, 844] : [844, 390]
  vi.stubGlobal('innerWidth', w)
  vi.stubGlobal('innerHeight', h)
  vi.stubGlobal('screen', { width: w, height: h })
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('coarse'), addEventListener: () => undefined, removeEventListener: () => undefined }))
}

describe('turning the phone upright mid-game', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    useGame.setState({ upright: false })
  })

  it('pauses the world behind the "turn your phone" screen, and resumes when it turns back', () => {
    holdPhone(true)
    render(<RotatePrompt path="/world" />)
    expect(useGame.getState().upright).toBe(true)
    expect(worldPaused()).toBe(true) // no walking, no monsters wandering, no taps

    holdPhone(false)
    act(() => void window.dispatchEvent(new Event('resize')))
    expect(useGame.getState().upright).toBe(false)
    expect(worldPaused()).toBe(false)
  })

  it('pages that work upright (a parent approving) never pause anything', () => {
    holdPhone(true)
    render(<RotatePrompt path="/parent" />)
    expect(useGame.getState().upright).toBe(false)
  })
})
