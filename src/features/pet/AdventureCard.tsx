import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Compass, Gift } from 'lucide-react'
import { Button } from '../../components/ui'
import { Snapshot } from '../../world3d/SnapshotImage'
import { supabase } from '../../services/supabase'
import { playSfx } from '../../audio/engine'
import type { Pet } from './petRules'
import { petKey, usePet } from './usePet'

export type Adventure = { status: 'none' } | { status: 'away' | 'back'; island: string; returns_at: string }
export type Souvenir = { id: string; en: string; ms: string; island: string; points?: number }

/** The fact in the player's language (Malay or English; other languages read the English for now). */
export const factText = (f: { en: string; ms: string }, lang: string) => (lang.startsWith('ms') ? f.ms : f.en)

type Props = { pet: Pet | null | undefined; adventure: Adventure | undefined; souvenir: Souvenir | null; busy: boolean; onClaim: () => void }

/** Home card: the pet exploring an island, back with a souvenir, or the fun fact it brought. Never a reminder to worry. */
export function AdventureCard({ pet, adventure, souvenir, busy, onClaim }: Props) {
  const { t, i18n } = useTranslation()
  if (!pet) return null
  const name = t(`pet.names.${pet.name}`)
  const picture = <Snapshot subject={{ kind: 'pet', pet }} px={64} alt="" className="size-10 shrink-0" />
  if (souvenir)
    return (
      <div className="flex items-start gap-3 rounded-xl border-2 border-gold bg-[#fff6d6] p-3 text-sm">
        {picture}
        <div className="flex flex-col gap-1">
          <p className="font-display font-semibold">{t('pet.souvenirTitle', { name, place: t(`regions.${souvenir.island}.name`) })}</p>
          <p>{factText(souvenir, i18n.language)}</p>
          {souvenir.points ? <p className="text-xs font-bold text-path-dark">{t('pet.souvenirPoints', { n: souvenir.points })}</p> : null}
        </div>
      </div>
    )
  if (!adventure || adventure.status === 'none') return null
  const place = t(`regions.${adventure.island}.name`)
  if (adventure.status === 'away')
    return (
      <p className="flex items-center gap-2 rounded-xl bg-water/15 px-3 py-2 text-sm font-semibold">
        <Compass size={18} className="text-water-dark" aria-hidden />
        <span>{t('pet.exploring', { name, place, time: new Date(adventure.returns_at).toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' }) })}</span>
      </p>
    )
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-gold bg-[#fff6d6] p-3 text-sm">
      {picture}
      <p className="flex-1 font-semibold">{t('pet.back', { name, place })}</p>
      <Button onClick={onClaim} disabled={busy}>
        <Gift size={18} aria-hidden /> {t('pet.openSouvenir')}
      </Button>
    </div>
  )
}

/** The signed-in player's adventure card, wired to the server. */
export function AdventureSlot({ uid }: { uid: string }) {
  const queryClient = useQueryClient()
  const pet = usePet(uid)
  const [busy, setBusy] = useState(false)
  const [souvenir, setSouvenir] = useState<Souvenir | null>(null)
  const adventure = useQuery({
    queryKey: ['adventure', uid],
    enabled: Boolean(pet.data),
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_adventure')
      if (error) throw error
      return data as Adventure
    },
  })
  async function claim() {
    setBusy(true)
    const { data, error } = await supabase!.rpc('claim_souvenir')
    setBusy(false)
    if (error) return
    playSfx('sparkle')
    setSouvenir(data as Souvenir)
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['adventure', uid] }), queryClient.invalidateQueries({ queryKey: petKey(uid) }), queryClient.invalidateQueries({ queryKey: ['souvenirs', uid] })])
  }
  return <AdventureCard pet={pet.data} adventure={adventure.data} souvenir={souvenir} busy={busy} onClaim={() => void claim()} />
}
