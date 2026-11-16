import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui'
import { useSession } from '../features/authentication/useSession'
import { academicQuery } from '../features/onboarding/useReferenceData'
import { characterQuery } from '../features/character/useCharacter'
import { guardRedirect } from './progress'

/** Sends players to the first setup step they still need, so no page is reachable out of order. */
export function RequireProgress({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { session, loading } = useSession()
  const uid = session?.user.id
  const academic = useQuery(academicQuery(uid))
  const character = useQuery(characterQuery(uid))

  if (loading || (uid && (academic.isPending || character.isPending))) {
    return <div className="grid min-h-dvh place-items-center bg-cream font-display text-wood-dark">{t('common.loading')}</div>
  }
  if (academic.isError || character.isError) {
    return (
      <div role="alert" className="grid min-h-dvh place-items-center gap-3 bg-cream p-6 text-center">
        <p className="font-semibold">{t('welcome.offline')}</p>
        <Button onClick={() => void Promise.all([academic.refetch(), character.refetch()])}>{t('common.retry')}</Button>
      </div>
    )
  }
  const target = guardRedirect(pathname, { session: Boolean(session), hasAcademicProfile: Boolean(academic.data), hasCharacter: Boolean(character.data) })
  return target ? <Navigate to={target} replace /> : children
}
