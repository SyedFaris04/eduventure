import { playSfx } from '../../audio/engine'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Snapshot } from '../../world3d/SnapshotImage'
import { useSession } from '../authentication/useSession'
import { usePet } from './usePet'
import type { Pet } from './petRules'

/** After a wrong answer the pet cheers the player on — it shares the miss, it never scolds. */
export function PetCheer({ pet }: { pet: Pet | null | undefined }) {
  const { t } = useTranslation()
  useEffect(() => {
    if (pet) playSfx('chirp')
  }, [pet])
  if (!pet) return null
  return (
    <p className="flex items-center gap-2 text-sm font-bold text-grass-dark">
      <Snapshot subject={{ kind: 'pet', pet }} px={48} alt="" className="size-8 shrink-0" />
      {t('pet.cheer', { name: t(`pet.names.${pet.name}`) })}
    </p>
  )
}

/** The signed-in player's pet cheering (nothing before an egg has hatched). */
export function MyPetCheer() {
  const { session } = useSession()
  const pet = usePet(session?.user.id)
  return <PetCheer pet={pet.data} />
}
