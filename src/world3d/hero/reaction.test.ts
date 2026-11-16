import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLatestReaction } from './reaction'

describe('useLatestReaction', () => {
  it('ignores reactions from before the world opened, then plays the newest one', () => {
    const { result, rerender } = renderHook(({ hit, cheer }) => useLatestReaction(hit, cheer), { initialProps: { hit: 3, cheer: 1 } })
    expect(result.current).toBeNull()
    rerender({ hit: 4, cheer: 1 })
    expect(result.current?.action).toBe('hit')
    const afterHit = result.current!.seq
    rerender({ hit: 4, cheer: 2 })
    expect(result.current?.action).toBe('cheer')
    expect(result.current!.seq).toBeGreaterThan(afterHit)
  })

  it('a win that also had a wrong answer ends with the cheer', () => {
    const { result, rerender } = renderHook(({ hit, cheer }) => useLatestReaction(hit, cheer), { initialProps: { hit: 0, cheer: 0 } })
    rerender({ hit: 1, cheer: 1 })
    expect(result.current?.action).toBe('cheer')
  })
})
