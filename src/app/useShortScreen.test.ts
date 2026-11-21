import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { SHORT_QUERY, useShortScreen } from './useShortScreen'

afterEach(() => vi.unstubAllGlobals())

describe('useShortScreen', () => {
  it('is the same media query as the CSS `short` variant', () => {
    expect(SHORT_QUERY).toBe('(orientation: landscape) and (max-height: 500px)')
  })

  it('follows the media query as the phone turns', () => {
    let listener: (() => void) | undefined
    const mql = { matches: false, addEventListener: (_: string, fn: () => void) => (listener = fn), removeEventListener: () => undefined }
    vi.stubGlobal('matchMedia', (q: string) => (q === SHORT_QUERY ? mql : { matches: false, addEventListener() {}, removeEventListener() {} }))
    const { result } = renderHook(() => useShortScreen())
    expect(result.current).toBe(false)
    mql.matches = true
    act(() => listener?.())
    expect(result.current).toBe(true)
  })

  it('is false where matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(() => useShortScreen()).result.current).toBe(false)
  })
})
