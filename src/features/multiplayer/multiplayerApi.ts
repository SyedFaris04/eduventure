import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export type ReportReason = 'rude_name' | 'bad_behaviour' | 'other'
export type Visibility = { visible: boolean; reason: null | 'off' | 'parent' | 'awaiting_parent' | 'banned' }

export const blocksKey = (uid?: string) => ['blocks', uid]
export const visibilityKey = (uid?: string) => ['visibility', uid]

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase!.rpc(fn, args)
  if (error) throw error
  return data as T
}

/** Players I have hidden for myself (by their public id). */
export function useBlocks(uid?: string) {
  return useQuery({ queryKey: blocksKey(uid), enabled: Boolean(uid), queryFn: async () => new Set(await rpc<string[]>('my_blocks')) })
}

export function useMyVisibility(uid?: string) {
  return useQuery({ queryKey: visibilityKey(uid), enabled: Boolean(uid), queryFn: () => rpc<Visibility>('my_visibility') })
}

export const blockPlayer = (id: string) => rpc<void>('block_player', { p_public_id: id })
export const unblockPlayer = (id: string) => rpc<void>('unblock_player', { p_public_id: id })
export const reportPlayer = (id: string, reason: ReportReason, place: string) => rpc<void>('report_player', { p_public_id: id, p_reason: reason, p_place: place })

/** My own "Let other players see me" switch. */
export async function setVisible(uid: string, visible: boolean) {
  const { error } = await supabase!.from('user_privacy_settings').update({ visible_to_others: visible }).eq('user_id', uid)
  if (error) throw error
}
