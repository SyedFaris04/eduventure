import { createBrowserRouter, Link, RouterProvider } from 'react-router'
import { StyleguidePage } from '../features/styleguide/StyleguidePage'

function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold">This path leads nowhere</h1>
        <Link to="/" className="mt-4 inline-block underline">
          Back to the start
        </Link>
      </div>
    </main>
  )
}

const router = createBrowserRouter([
  // shortcut: `/` shows the style guide until the loading screen lands in Task 3.
  { path: '/', element: <StyleguidePage /> },
  { path: '/styleguide', element: <StyleguidePage /> },
  { path: '*', element: <NotFound /> },
])

export function App() {
  return <RouterProvider router={router} />
}
