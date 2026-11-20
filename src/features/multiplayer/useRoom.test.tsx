import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const started = vi.hoisted(() => ({ n: 0, visibility: { visible: true } as { visible: boolean } | undefined }))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('./multiplayerApi', () => ({ useBlocks: () => ({ data: new Set() }), useMyVisibility: () => ({ data: started.visibility }) }))
// A configured client without needing .env.local (CI has no Supabase keys for unit tests).
vi.mock('../../services/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }))
vi.mock('./roomClient',() => ({ startRoom: () => (started.n++, { stop() {}, sendMove() {}, sendEmote() {} }) }))

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

  it("waits for the player's own visibility before joining, so a first join is never thrown away", () => {
    vi.stubEnv('VITE_ROOMS_URL', 'ws://rooms')
    started.n = 0
    started.visibility = undefined
    const { rerender } = renderHook(() => useRoomConnection('greenhaven'))
    expect(started.n).toBe(0)
    started.visibility = { visible: true }
    rerender()
    expect(started.n).toBe(1)
    vi.unstubAllEnvs()
  })
})
