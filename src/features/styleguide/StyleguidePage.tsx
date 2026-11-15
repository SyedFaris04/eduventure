import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button, Card, Field, Modal, Panel, ProgressBar } from '../../components/ui'
import { pingSupabase } from '../../services/supabase'

const COLOURS = ['grass', 'grass-dark', 'path', 'path-dark', 'cream', 'water', 'water-dark', 'wood', 'wood-dark', 'ink', 'gold', 'danger']

/** Developer page showing every design token and component. */
export function StyleguidePage() {
  const [selected, setSelected] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [progress, setProgress] = useState(0.78)
  const [status, setStatus] = useState('Checking Supabase…')

  useEffect(() => {
    pingSupabase()
      .then((v) => setStatus(`Supabase connected (auth ${v})`))
      .catch((e: Error) => setStatus(`Supabase not connected: ${e.message}`))
  }, [])

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-10">
      <header>
        <h1 className="text-4xl font-bold text-wood-dark">Eduventure style guide</h1>
        <p role="status" className="mt-1 text-sm text-ink/70">
          {status}
        </p>
      </header>

      <Panel title="Colours">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {COLOURS.map((c) => (
            <li key={c} className="text-center text-xs">
              <div className="mb-1 h-12 rounded-xl border-2 border-wood-dark/30" style={{ background: `var(--color-${c})` }} />
              {c}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Buttons">
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg">
            <Sparkles size={20} /> Start Your Adventure
          </Button>
          <Button variant="secondary">Login</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Panel>

      <Panel title="Cards">
        <div className="grid gap-4 sm:grid-cols-3">
          {['Primary School', 'Lower Secondary', 'University'].map((label, i) => (
            <Card key={label} selected={selected === i} onSelect={() => setSelected(i)}>
              <strong className="font-display text-lg">{label}</strong>
              <p className="text-sm text-ink/70">Selectable card</p>
            </Card>
          ))}
        </div>
      </Panel>

      <Panel title="Progress">
        <ProgressBar value={progress} label="Example progress" />
        <input
          type="range"
          aria-label="Set progress"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="mt-4 w-full"
        />
      </Panel>

      <Panel title="Form">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" type="email" placeholder="you@example.com" hint="We never show this to other players." />
          <Field label="Password" type="password" error="Use at least 10 characters." />
        </div>
      </Panel>

      <Panel title="Modal">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Treasure found!">
          <p>You found 25 gold. Modals close with Escape or the X button.</p>
        </Modal>
      </Panel>
    </main>
  )
}
