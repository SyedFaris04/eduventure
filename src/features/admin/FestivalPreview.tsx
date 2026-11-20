import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui'
import { supabase } from '../../services/supabase'
import { useSession } from '../authentication/useSession'
import { festivalsKey, setFestivalPreview } from '../festival/festivalApi'
import { ownedItemsKey } from '../shop/useShop'

type Row = { id: string; kind: string; starts_on: string; ends_on: string }

/** Admins only (English, like the rest of /admin): see a festival as if it were on, on your own account. */
export function FestivalPreview() {
  const queryClient = useQueryClient()
  const uid = useSession().session?.user.id
  const [choice, setChoice] = useState('')
  const [reset, setReset] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const festivals = useQuery({
    queryKey: ['admin', 'festivals'],
    queryFn: async () => {
      const { data, error } = await supabase!.from('festivals').select('id, kind, starts_on, ends_on').order('starts_on')
      if (error) throw error
      return data as Row[]
    },
  })

  async function apply() {
    setMessage(null)
    try {
      await setFestivalPreview(choice || null, Boolean(choice) && reset)
      await Promise.all([festivalsKey(uid), ['missions', uid], ownedItemsKey(uid)].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      setMessage(choice ? `Previewing ${choice}.` : 'Preview off.')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  return (
    <section aria-label="Festival preview" className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-gold bg-cream p-3 text-sm">
      <label className="flex items-center gap-2 font-bold">
        Festival preview
        <select aria-label="Festival preview" value={choice} onChange={(e) => setChoice(e.target.value)} className="rounded-lg border-2 border-wood/40 bg-white px-2 py-1">
          <option value="">None</option>
          {festivals.data?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.id} ({f.starts_on} to {f.ends_on})
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} />
        Reset my preview progress
      </label>
      <Button onClick={() => void apply()}>Apply</Button>
      <p className="basis-full text-ink/70">
        Shows the festival's decorations, missions and stall on your account only. Reset removes your own missions and items for that festival and sets your
        festival tokens to 50. Festival dates are edited in the Supabase table editor (table <code>festivals</code>).
      </p>
      {message && <p role="status" className="basis-full font-semibold">{message}</p>}
    </section>
  )
}
