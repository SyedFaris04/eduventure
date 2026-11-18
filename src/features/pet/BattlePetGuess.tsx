import { useTranslation } from 'react-i18next'
import { useSession } from '../authentication/useSession'
import type { PublicQuestion } from '../battle/questionSchema'
import { PetGuess } from './PetGuess'
import { usePet } from './usePet'

/** The signed-in player's pet guessing on a battle question: the option's text, or True/False. */
export function BattlePetGuess({ question, guess, result }: { question: PublicQuestion; guess: string | null; result: 'taught' | 'both' | null | undefined }) {
  const { t } = useTranslation()
  const { session } = useSession()
  const pet = usePet(session?.user.id)
  if (!guess) return null
  const options = (question as { options?: { id: string; text: string }[] }).options
  const text = question.type === 'true_false' ? t(guess === 'true' ? 'battle.true' : 'battle.false') : (options?.find((o) => o.id === guess)?.text ?? guess)
  return <PetGuess pet={pet.data} guess={text} result={result} />
}
