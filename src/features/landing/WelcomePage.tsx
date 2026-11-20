import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CircleAlert, Compass, LogIn, Sparkles, UserPlus, WifiOff } from 'lucide-react'
import { Button, buttonClasses } from '../../components/ui'
import { LanguagePicker } from '../../i18n/LanguagePicker'
import { AuthMessageError, startGuest } from '../authentication/authActions'
import { useSession } from '../authentication/useSession'
import { SceneBackdrop } from './SceneBackdrop'
import './landing.css'
import { withBase } from '../../app/base'

const HeroScene = lazy(() => import('./HeroScene'))

/** 3D only where it will run smoothly and is wanted; everyone else gets the painted backdrop alone. */
function canRender3D(): boolean {
  if (typeof WebGLRenderingContext === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  if ((navigator.hardwareConcurrency ?? 4) <= 4) return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function WelcomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, offline } = useSession()
  const [show3D] = useState(canRender3D)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // Returning players keep their account; everyone else starts as a guest with nothing personal stored.
  async function start() {
    setStartError(null)
    if (session) return navigate('/home') // the progress guard forwards to any unfinished setup step
    setStarting(true)
    try {
      await startGuest()
      navigate('/onboarding')
    } catch (e) {
      setStartError(e instanceof AuthMessageError ? e.key : 'auth.errors.generic')
    } finally {
      setStarting(false)
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <SceneBackdrop />
      <LanguagePicker className="absolute top-4 end-4 z-10" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-4 px-4 pt-16 pb-10 short:grid-cols-2 short:gap-6 short:pt-4 short:pb-4 md:grid-cols-2 md:gap-8 md:pt-6">
        <div className="order-1 h-[34dvh] min-h-56 short:order-2 short:h-[80dvh] short:min-h-0 md:order-2 md:h-[70dvh]">
          {show3D && (
            <Suspense fallback={null}>
              <HeroScene />
            </Suspense>
          )}
        </div>

        <div className="rise-in order-2 flex flex-col items-center text-center short:order-1 md:order-1 md:items-start md:text-start">
          <h1 className="title-outline bg-gradient-to-b from-[#fff1a8] via-gold to-[#ef9b2f] bg-clip-text font-display text-[clamp(2.5rem,10vw,4.5rem)] leading-none font-bold short:text-5xl tracking-wide text-transparent">
            {t('common.appName').toUpperCase()}
          </h1>
          <p className="mt-4 -rotate-1 rounded-xl border-[3px] border-wood bg-cream px-4 py-1.5 font-display text-lg font-semibold text-wood-dark shadow-[0_3px_0_var(--color-wood)] sm:text-xl">
            {t('common.tagline')}
          </p>
          <p className="mt-4 max-w-md text-base font-semibold text-ink/80 sm:text-lg">{t('welcome.subtitle')}</p>

          {offline && (
            <div role="alert" className="mt-5 flex w-full max-w-sm items-center gap-3 rounded-2xl border-[3px] border-danger bg-cream p-3 text-start">
              <WifiOff className="shrink-0 text-danger" aria-hidden />
              <p className="flex-1 text-sm font-semibold">{t('welcome.offline')}</p>
              <Button variant="secondary" onClick={() => window.location.assign(withBase('/'))}>
                {t('common.retry')}
              </Button>
            </div>
          )}

          <nav className="mt-6 flex w-full max-w-sm flex-col gap-3">
            <Button size="lg" className="w-full" onClick={start} disabled={starting}>
              <Sparkles size={22} aria-hidden /> {starting ? t('common.loading') : t('welcome.start')}
            </Button>
            {startError && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-cream/90 p-2 text-start text-sm font-semibold text-ink">
                <CircleAlert size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden /> {t(startError)}
              </p>
            )}
            <div className="grid gap-3 min-[420px]:grid-cols-2">
              <Link to="/login" className={buttonClasses('secondary', 'md', 'whitespace-nowrap px-3')}>
                <LogIn size={18} aria-hidden /> {t('welcome.login')}
              </Link>
              <Link to="/signup" className={buttonClasses('secondary', 'md', 'whitespace-nowrap px-3')}>
                <UserPlus size={18} aria-hidden /> {t('welcome.signup')}
              </Link>
            </div>
            <Link to="/explore" className={buttonClasses('ghost', 'md', 'bg-cream/70 border-wood/40!')}>
              <Compass size={18} aria-hidden /> {t('welcome.explore')}
            </Link>
          </nav>
        </div>
      </div>
    </main>
  )
}
