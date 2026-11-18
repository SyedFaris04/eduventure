import { useTranslation } from 'react-i18next'
import { Snapshot } from '../../world3d/SnapshotImage'
import type { Pet } from './petRules'

/**
 * The pet's guess on a battle question (picked at random, so it is no hint) and, after the answer, the protégé moment:
 * "You taught Comel!" when the player was right and the pet was not.
 */
export function PetGuess({ pet, guess, result }: { pet: Pet | null | undefined; guess: string | null; result: 'taught' | 'both' | null | undefined }) {
  const { t } = useTranslation()
  if (!pet || !guess) return null
  const name = t(`pet.names.${pet.name}`)
  const line = result === 'taught' ? t('pet.taught', { name }) : result === 'both' ? t('pet.both', { name }) : t('pet.guess', { name, answer: guess })
  return (
    <p className={`flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold ${result === 'taught' ? 'bg-gold/30 text-wood-dark' : 'bg-white/70 text-wood-dark'}`}>
      <Snapshot subject={{ kind: 'pet', pet }} px={48} alt="" className="size-8 shrink-0" />
      <span>{line}</span>
    </p>
  )
}
