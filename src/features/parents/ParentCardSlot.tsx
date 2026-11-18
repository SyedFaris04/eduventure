import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AskParentCard } from './AskParentCard'
import { guardianKey, requestGuardianCode, useGuardian } from './useGuardian'

/** The signed-in player's Ask-my-parent card, wired to the server. */
export function ParentCardSlot({ uid }: { uid: string }) {
  const queryClient = useQueryClient()
  const guardian = useGuardian(uid)
  const [busy, setBusy] = useState(false)
  async function ask() {
    setBusy(true)
    try {
      await requestGuardianCode()
      await queryClient.invalidateQueries({ queryKey: guardianKey(uid) })
    } finally {
      setBusy(false)
    }
  }
  return <AskParentCard guardian={guardian.data} busy={busy} onAsk={() => void ask()} />
}
