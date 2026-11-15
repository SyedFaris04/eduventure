import { createBrowserRouter, Link, RouterProvider, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { StyleguidePage } from '../features/styleguide/StyleguidePage'
import { LoadingScreen } from '../features/loading/LoadingScreen'
import { BOOT_TASKS } from './bootTasks'

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
      onDone={({ failed }) => navigate('/welcome', { replace: true, state: { offline: failed.includes('session') } })}
    />
  )
}

const router = createBrowserRouter([
  { path: '/', element: <BootRoute /> },
  { path: '/styleguide', element: <StyleguidePage /> },
  { path: '*', element: <NotFound /> },
])

export function App() {
  return <RouterProvider router={router} />
}
