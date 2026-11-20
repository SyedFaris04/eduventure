import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import type { Appearance } from '../character/appearance'
import type { Pet } from '../pet/petRules'
import { supabase } from '../../services/supabase'
import { useSession } from '../authentication/useSession'
import { useBlocks, useMyVisibility } from './multiplayerApi'
import { startRoom, type RoomClient } from './roomClient'

/** Kept in step with server/rooms/src/room.ts. */
export const EMOTES = ['wave', 'cheer', 'clap', 'thumbs_up', 'good_luck', 'well_done'] as const
export type Emote = (typeof EMOTES)[number]
export type OtherPet = Pick<Pet, 'species' | 'stage' | 'form' | 'look'>
export type OtherPlayer = { id: string; name: string | null; appearance: Appearance; pet: OtherPet | null; x: number; y: number; battle: boolean }

type RoomState = {
  /** off: multiplayer not configured or stopped; solo: configured but not connected right now. */
  status: 'off' | 'connecting' | 'online' | 'solo'
  you: string | null
  canEmote: boolean
  players: Record<string, OtherPlayer>
  emotes: Record<string, { e: Emote; at: number }>
}
export const EMPTY_ROOM: RoomState = { status: 'off', you: null, canEmote: true, players: {}, emotes: {} }
export const useRoom = create<RoomState>(() => EMPTY_ROOM)

/** The live room for this place, or null when multiplayer is off (no VITE_ROOMS_URL, no session). */
export function useRoomConnection(place: string): RoomClient | null {
  const uid = useSession().session?.user.id
  const visible = useMyVisibility(uid).data?.visible
  const blocks = useBlocks(uid).data
  const blocked = useRef(blocks)
  blocked.current = blocks
  const [client, setClient] = useState<RoomClient | null>(null)

  useEffect(() => {
    const url = import.meta.env.VITE_ROOMS_URL as string | undefined
    if (!url || !uid || !supabase) return
    const c = startRoom({
      url,
      place,
      token: async () => (await supabase!.auth.getSession()).data.session?.access_token ?? null,
      blocked: () => blocked.current ?? new Set(),
    })
    setClient(c)
    return () => {
      c.stop()
      setClient(null)
    }
    // Rejoining when my own switch changes shows or hides me to the others straight away.
  }, [place, uid, visible])

  // Someone I just hid disappears now, not at the next join.
  useEffect(() => {
    if (!blocks?.size) return
    useRoom.setState((s) => ({ players: Object.fromEntries(Object.entries(s.players).filter(([id]) => !blocks.has(id))) }))
  }, [blocks])

  return client
}
