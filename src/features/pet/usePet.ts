import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import type { Pet, PetSpecies } from './petRules'

export const petKey = (uid: string | undefined) => ['pet', uid]

/** The player's pet, or null before an egg has hatched. The database decides everything about it. */
export function usePet(uid: string | undefined) {
  return useQuery({
    queryKey: petKey(uid),
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase!.from('player_pets').select('species, name, stage, form, points, branches, look').maybeSingle()
      if (error) throw error
      return (data as Pet | null) ?? null
    },
  })
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase!.rpc(fn, args)
  if (error) throw error
  return data as T
}

export const hatchPet = (species: PetSpecies, name: string) => call<Pet>('hatch_pet', { p_species: species, p_name: name })
export const evolvePet = () => call<{ pet: Pet; gold: number }>('evolve_pet')
export const dressPet = (slot: 'hat' | 'neck' | 'dye', item: string | null) => call<Pet['look']>('dress_pet', { p_slot: slot, p_item: item })
