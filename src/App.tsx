import { useEffect, useState } from 'react'
import { pingSupabase } from './services/supabase'

// Phase 0 placeholder: replaced by the loading screen and router in Phase 1.
export function App() {
  const [status, setStatus] = useState('Checking Supabase connection…')

  useEffect(() => {
    pingSupabase()
      .then((version) => setStatus(`Supabase connected (auth ${version})`))
      .catch((err: Error) => setStatus(`Supabase not connected: ${err.message}`))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>EDUVENTURE</h1>
      <p>Learn. Explore. Grow. Conquer.</p>
      <p role="status">{status}</p>
    </main>
  )
}
