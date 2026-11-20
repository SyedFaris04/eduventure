import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export type BoardReason = 'guest' | 'no_age' | 'banned' | 'hidden_parent' | 'hidden_self' | 'awaiting_parent' | 'needs_parent' | 'parent_off' | 'chat_off'
export type BoardRights = { can_write: boolean; can_type: boolean; reason: BoardReason | null }
export type BoardNote = { id: number; public_id: string; name: string | null; sticker: string | null; phrase: string | null; body: string | null; created_at: string; mine: boolean }
export type IslandBoard = { open: boolean; notes: BoardNote[] }
export type NoteDraft = { sticker?: string; phrase?: string; body?: string }
export type NoteReportReason = 'rude' | 'personal_info' | 'unkind' | 'other'

/** Turns database errors into i18n keys. */
export function boardErrorKey(message: string | undefined) {
  const m = message ?? ''
  const problem = /Not allowed: (\w+)/.exec(m)?.[1]
  const reason = /cannot write here: (\w+)/.exec(m)?.[1]
  return problem ? `board.error.${problem}`
    : reason ? `board.reason.${reason}`
    : /too long/i.test(m) ? 'board.error.long'
    : /too many notes/i.test(m) ? 'board.error.limit'
    : /not built/i.test(m) ? 'board.error.closed'
    : /too many reports/i.test(m) ? 'board.error.reportLimit'
    : 'board.error.generic'
}

export class BoardError extends Error {}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase!.rpc(fn, args)
  if (error) throw new BoardError(boardErrorKey(error.message))
  return data as T
}

export const boardKey = (place: string) => ['board', place]
export const boardRightsKey = (uid?: string) => ['board-rights', uid]

/** An open board refreshes every 20 seconds (no live updates, to stay inside the free plan); a closed one never does. */
export const boardQuery = (place: string, open: boolean) => ({
  queryKey: boardKey(place),
  enabled: open,
  refetchInterval: open ? (20_000 as const) : (false as const),
  refetchIntervalInBackground: false,
  queryFn: () => call<IslandBoard>('island_board', { p_place: place }),
})

export const useIslandBoard = (place: string, open: boolean) => useQuery(boardQuery(place, open))
export const useBoardRights = (uid?: string) =>
  useQuery({ queryKey: boardRightsKey(uid), enabled: Boolean(uid), queryFn: () => call<BoardRights>('board_rights') })

export const postNote = (place: string, note: NoteDraft) =>
  call<{ id: number }>('post_note', { p_place: place, p_sticker: note.sticker ?? null, p_phrase: note.phrase ?? null, p_body: note.body ?? null })
export const reportNote = (id: number, reason: NoteReportReason) => call<void>('report_note', { p_id: id, p_reason: reason })
export const deleteMyNote = (id: number) => call<void>('delete_my_note', { p_id: id })
