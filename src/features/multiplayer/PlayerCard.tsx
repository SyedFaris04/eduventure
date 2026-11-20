import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { EyeOff, Flag, X } from 'lucide-react'
import { Button } from '../../components/ui'
import { useGame } from '../../game/store'
import { usePlace } from '../../game/placeStore'
import { useSession } from '../authentication/useSession'
import { blockPlayer, blocksKey, reportPlayer, type ReportReason } from './multiplayerApi'
import { useRoom } from './useRoom'

const REASONS: ReportReason[] = ['rude_name', 'bad_behaviour', 'other']

/** Opened by tapping another player's name tag: hide them for yourself, or report them. */
export function PlayerCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const uid = useSession().session?.user.id
  const place = usePlace((s) => s.place)
  const id = useGame((s) => s.playerCard)
  const player = useRoom((s) => (id ? s.players[id] : undefined))
  const [step, setStep] = useState<'menu' | 'reasons' | 'thanks'>('menu')
  const [error, setError] = useState<string | null>(null)
  if (!id) return null
  const name = player?.name ?? t('multiplayer.player')
  const close = () => {
    setStep('menu')
    setError(null)
    useGame.setState({ playerCard: null })
  }

  async function hide() {
    try {
      await blockPlayer(id!)
      useRoom.setState((s) => {
        const players = { ...s.players }
        delete players[id!]
        return { players }
      })
      await queryClient.invalidateQueries({ queryKey: blocksKey(uid) })
      close()
    } catch {
      setError(t('battle.errors.generic'))
    }
  }

  async function report(reason: ReportReason) {
    try {
      await reportPlayer(id!, reason, place)
      setStep('thanks')
    } catch (e) {
      setError(t(/too many/i.test((e as { message?: string }).message ?? '') ? 'multiplayer.errors.tooMany' : 'battle.errors.generic'))
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-ink/40 p-3" onClick={close}>
      <section role="dialog" aria-modal="true" aria-label={name} onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-3xl border-4 border-wood bg-cream p-4 shadow-xl">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-wood-dark">{name}</h2>
          <button type="button" onClick={close} aria-label={t('common.close')} className="grid size-9 place-items-center rounded-full bg-white">
            <X size={18} aria-hidden />
          </button>
        </header>
        {error && (
          <p role="alert" className="mb-2 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        {step === 'menu' && (
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => void hide()}>
              <EyeOff size={18} aria-hidden /> {t('multiplayer.hide')}
            </Button>
            <Button variant="secondary" onClick={() => setStep('reasons')}>
              <Flag size={18} aria-hidden /> {t('multiplayer.report')}
            </Button>
          </div>
        )}
        {step === 'reasons' && (
          <div className="flex flex-col gap-2">
            {REASONS.map((r) => (
              <Button key={r} variant="secondary" onClick={() => void report(r)}>
                {t(`multiplayer.reason.${r}`)}
              </Button>
            ))}
          </div>
        )}
        {step === 'thanks' && <p className="font-semibold text-wood-dark">{t('multiplayer.reported')}</p>}
      </section>
    </div>
  )
}
