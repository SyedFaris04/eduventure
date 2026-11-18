import { startMusicDirector } from '../audio/director'
import type { ComponentType } from 'react'
import { createBrowserRouter, Link, RouterProvider, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LoadingScreen } from '../features/loading/LoadingScreen'
import { useSessionStore } from '../features/authentication/useSession'
import { academicQuery } from '../features/onboarding/useReferenceData'
import { characterQuery } from '../features/character/useCharacter'
import { supabase } from '../services/supabase'
import { BOOT_TASKS } from './bootTasks'
import { RequireProgress } from './guards'
import { nextRequiredRoute } from './progress'
import { queryClient } from './providers'

function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold">{t('common.notFound')}</h1>
        <Link to="/" className="mt-4 inline-block underline">
          {t('common.backToStart')}
        </Link>
      </div>
    </main>
  )
}

function BootRoute() {
  const navigate = useNavigate()
  return (
    <LoadingScreen
      tasks={BOOT_TASKS}
      onDone={async ({ failed }) => {
        const offline = failed.includes('session')
        useSessionStore.setState({ offline })
        const session = offline || !supabase ? null : (await supabase.auth.getSession()).data.session
        const uid = session?.user.id
        // Progress was prefetched during loading, so returning players skip straight to where they left off.
        const target = nextRequiredRoute({
          session: Boolean(session),
          hasAcademicProfile: Boolean(queryClient.getQueryData(academicQuery(uid).queryKey)),
          hasCharacter: Boolean(queryClient.getQueryData(characterQuery(uid).queryKey)),
        })
        navigate(target ?? '/home', { replace: true })
      }}
    />
  )
}

// Shown for the instant a page chunk is downloading on a direct visit.
const hydrateFallbackElement = <div className="min-h-dvh bg-cream" />

/** Lazy page; `guarded` pages sit behind the setup-progress guard. */
function page(load: () => Promise<ComponentType>, guarded = false) {
  return {
    hydrateFallbackElement,
    lazy: async () => {
      const Page = await load()
      return {
        Component: guarded
          ? () => (
              <RequireProgress>
                <Page />
              </RequireProgress>
            )
          : Page,
      }
    },
  }
}

// Every page except the loading screen is its own chunk, so the first download stays small.
const router = createBrowserRouter([
  { path: '/', element: <BootRoute /> },
  { path: '/welcome', ...page(async () => (await import('../features/landing/WelcomePage')).WelcomePage) },
  { path: '/explore', ...page(async () => (await import('../features/landing/ExplorePage')).ExplorePage) },
  { path: '/login', ...page(async () => (await import('../features/authentication/LoginPage')).LoginPage) },
  { path: '/signup', ...page(async () => (await import('../features/authentication/SignupPage')).SignupPage) },
  { path: '/reset-password', ...page(async () => (await import('../features/authentication/ResetPasswordPage')).ResetPasswordPage) },
  { path: '/update-password', ...page(async () => (await import('../features/authentication/UpdatePasswordPage')).UpdatePasswordPage) },
  { path: '/onboarding', ...page(async () => (await import('../features/onboarding/OnboardingPage')).OnboardingPage, true) },
  {
    path: '/settings/academic',
    ...page(async () => {
      const { OnboardingPage } = await import('../features/onboarding/OnboardingPage')
      return () => <OnboardingPage mode="edit" />
    }, true),
  },
  { path: '/character', ...page(async () => (await import('../features/character/CharacterCreatorPage')).CharacterCreatorPage, true) },
  { path: '/home', ...page(async () => (await import('../features/home/HomePage')).HomePage, true) },
  { path: '/world', ...page(async () => (await import('../features/world/WorldPage')).WorldPage, true) },
  { path: '/library', ...page(async () => (await import('../features/library/LibraryPage')).LibraryPage, true) },
  { path: '/shop', ...page(async () => (await import('../features/shop/ShopPage')).ShopPage, true) },
  // Parents approve here without making a game character, so it is not behind the onboarding guard.
  { path: '/parent', ...page(async () => (await import('../features/parents/ParentPage')).ParentPage) },
  { path: '/teacher', ...page(async () => (await import('../features/teacher/TeacherPage')).TeacherPage) },
  { path: '/pet', ...page(async () => (await import('../features/pet/PetPage')).PetPage, true) },
  { path: '/academy', ...page(async () => (await import('../features/academy/AcademyPages')).AcademyPage, true) },
  { path: '/academy/:course', ...page(async () => (await import('../features/academy/AcademyPages')).CoursePage, true) },
  { path: '/academy/:course/:lesson', ...page(async () => (await import('../features/academy/AcademyPages')).LessonPage, true) },
  {
    path: '/hall',
    ...page(async () => {
      const { AcademyPage } = await import('../features/academy/AcademyPages')
      return () => <AcademyPage kind="language" />
    }, true),
  },
  { path: '/hall/:course', ...page(async () => (await import('../features/academy/AcademyPages')).CoursePage, true) },
  { path: '/hall/:course/:lesson', ...page(async () => (await import('../features/academy/AcademyPages')).LessonPage, true) },
  { path: '/admin', ...page(async () => (await import('../features/admin/AdminPage')).AdminPage) },
  { path: '/styleguide', ...page(async () => (await import('../features/styleguide/StyleguidePage')).StyleguidePage) },
  ...(import.meta.env.DEV
    ? [
        { path: '/dev/hero', ...page(async () => (await import('../world3d/hero/HeroLab')).default) },
        { path: '/dev/world', ...page(async () => (await import('../world3d/WorldLab')).default) },
      ]
    : []),
  { path: '*', element: <NotFound /> },
])

// Calm music follows the page and the island; it starts on the first tap.
startMusicDirector(router)

export function App() {
  return <RouterProvider router={router} />
}
