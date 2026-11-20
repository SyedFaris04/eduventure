import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui'
import { supabase } from '../../services/supabase'
import en from '../../i18n/locales/en.json'
import { STICKER_ICON, type StickerKey } from '../board/boardRules'

type Note = {
  id: number; place: string; sticker: string | null; phrase: string | null; body: string | null; public_id: string; name: string | null
  hidden: boolean; deleted?: boolean; reports: number; reasons: string[]; created_at: string
}
const REASON: Record<string, string> = { rude: 'Rude words', personal_info: 'Personal information', unkind: 'Unkind', other: 'Something else' }
const PHRASE = en.board.phrase as Record<string, string>
const key = ['admin', 'reported-notes']

/** Admins and moderators (English, like the rest of /admin): reported camp-board notes. Three reports hide a note until decided here. */
export function ReportedNotes() {
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const notes = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('reported_notes')
      if (error) throw error
      return data as Note[]
    },
  })

  async function run(fn: string, args: Record<string, unknown>, done: string) {
    setMessage(null)
    const { error } = await supabase!.rpc(fn, args)
    setMessage(error ? error.message : done)
    await queryClient.invalidateQueries({ queryKey: key })
  }

  return (
    <section aria-label="Reported notes" className="flex flex-col gap-2 rounded-2xl border-2 border-wood/40 bg-white p-3 text-sm">
      <h2 className="font-display text-lg font-bold text-wood-dark">Reported notes</h2>
      <p className="text-ink/70">
        Notes from the island camp boards. A note with 3 reports is hidden until you decide. Remove deletes it; Keep shows it again (unless its writer
        deleted it) and closes its reports. A word that got past the filter: add it to <code>content/blocked-words.txt</code>.
      </p>
      {message && <p role="status" className="font-semibold">{message}</p>}
      {notes.data?.length === 0 && <p>No reported notes.</p>}
      <ul className="flex flex-col gap-2">
        {notes.data?.map((n) => {
          const name = n.name ?? 'Player'
          return (
            <li key={n.id} className="flex flex-col gap-1 rounded-xl border border-wood/30 p-2">
              <p>
                {n.sticker && <span aria-hidden>{STICKER_ICON[n.sticker as StickerKey]} </span>}
                {n.phrase && <span className="font-semibold">{PHRASE[n.phrase]} </span>}
                {n.body && <span>{n.body}</span>}
              </p>
              <p className="text-ink/60">
                <span className="font-bold text-ink">{name}</span> · {n.place} · {new Date(n.created_at).toLocaleString()} · {n.reports} reports (
                {n.reasons.map((r) => REASON[r] ?? r).join(', ')}){n.hidden ? ' · hidden' : ''}{n.deleted ? ' · deleted by the writer' : ''}
              </p>
              <span className="flex flex-wrap items-center gap-2">
                <Button aria-label={`Remove note ${n.id}`} onClick={() => void run('resolve_note', { p_id: n.id, p_remove: true }, 'Note removed.')}>
                  Remove
                </Button>
                <Button variant="secondary" aria-label={`Keep note ${n.id}`} onClick={() => void run('resolve_note', { p_id: n.id, p_remove: false }, 'Note kept.')}>
                  Keep
                </Button>
                <label className="ms-auto flex items-center gap-1">
                  <input
                    type="checkbox"
                    aria-label={`Confirm ban for ${name}`}
                    checked={confirm.has(n.id)}
                    onChange={(e) => setConfirm((c) => (e.target.checked ? new Set([...c, n.id]) : new Set([...c].filter((x) => x !== n.id))))}
                  />
                  sure
                </label>
                <Button
                  variant="secondary"
                  aria-label={`Ban ${name} from multiplayer`}
                  disabled={!confirm.has(n.id)}
                  onClick={() => void run('ban_from_multiplayer', { p_public_id: n.public_id, p_banned: true }, `${name} is banned from multiplayer.`)}
                >
                  Ban
                </Button>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
