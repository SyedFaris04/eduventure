import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui'
import { supabase } from '../../services/supabase'

type Report = { id: number; reported_public_id: string; name: string | null; reason: string; place: string | null; created_at: string; open_count: number }
const REASON: Record<string, string> = { rude_name: 'Rude name', bad_behaviour: 'Bad behaviour', other: 'Something else' }
const key = ['admin', 'player-reports']

/** Admins and moderators (English, like the rest of /admin): open player reports, close them, or ban from multiplayer. */
export function PlayerReports() {
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const reports = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('open_reports')
      if (error) throw error
      return data as Report[]
    },
  })

  async function run(fn: string, args: Record<string, unknown>, done: string) {
    setMessage(null)
    const { error } = await supabase!.rpc(fn, args)
    setMessage(error ? error.message : done)
    await queryClient.invalidateQueries({ queryKey: key })
  }

  return (
    <section aria-label="Player reports" className="flex flex-col gap-2 rounded-2xl border-2 border-wood/40 bg-white p-3 text-sm">
      <h2 className="font-display text-lg font-bold text-wood-dark">Player reports</h2>
      <p className="text-ink/70">
        A rude name that got past the filter: add the word to the <code>blocked_words</code> table in the Supabase table editor. The name then shows as
        "Player" and must be changed at the next save. Banning hides a player from multiplayer and closes their open reports.
      </p>
      {message && <p role="status" className="font-semibold">{message}</p>}
      {reports.data?.length === 0 && <p>No open reports.</p>}
      <ul className="flex flex-col gap-2">
        {reports.data?.map((r) => {
          const name = r.name ?? 'Player'
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-wood/30 p-2">
              <span className="font-bold">{name}</span>
              <span>{REASON[r.reason] ?? r.reason}</span>
              <span className="text-ink/60">
                {r.place ?? '—'} · {new Date(r.created_at).toLocaleString()} · {r.open_count} open
              </span>
              <span className="ms-auto flex items-center gap-2">
                <Button variant="secondary" aria-label={`Close report ${r.id}`} onClick={() => void run('close_report', { p_id: r.id }, 'Report closed.')}>
                  Close
                </Button>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    aria-label={`Confirm ban for ${name}`}
                    checked={confirm.has(r.id)}
                    onChange={(e) => setConfirm((c) => (e.target.checked ? new Set([...c, r.id]) : new Set([...c].filter((x) => x !== r.id))))}
                  />
                  sure
                </label>
                <Button
                  aria-label={`Ban ${name} from multiplayer`}
                  disabled={!confirm.has(r.id)}
                  onClick={() => void run('ban_from_multiplayer', { p_public_id: r.reported_public_id, p_banned: true }, `${name} is banned from multiplayer.`)}
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
