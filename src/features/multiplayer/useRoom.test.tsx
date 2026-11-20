import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const started = vi.hoisted(() => ({ n: 0 }))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('./multiplayerApi', () => ({ useBlocks: () => ({ data: new Set() }), useMyVisibility: () => ({ data: { visible: true } }) }))
vi.mock('./roomClient', () => ({ startRoom: () => (started.n++, { stop() {}, sendMove() {}, sendEmote() {} }) }))

const { useRoom, useRoomConnection } = await import('./useRoom')

describe('useRoomConnection', () => {
  it('stays off and never connects when no room server is configured', () => {
    vi.stubEnv('VITE_ROOMS_URL', '')
    const { result } = renderHook(() => useRoomConnection('greenhaven'))
    expect(result.current).toBeNull()
    expect(started.n).toBe(0)
    expect(useRoom.getState().status).toBe('off')
    vi.unstubAllEnvs()
  })
})
