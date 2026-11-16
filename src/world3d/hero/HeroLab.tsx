import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, PART_ORDER, shopValues, type Appearance, type AppearancePart } from '../../features/character/appearance'
import { HeroModel } from './HeroModel'
import { Snapshot } from '../SnapshotImage'

/** Development-only contact sheet (/dev/hero?part=top&turn=0.6): every value of one part side by side, for checking the 3D parts by eye. */
export default function HeroLab() {
  const q = new URLSearchParams(location.search)
  if (q.get('snap'))
    return (
      <main style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 12, background: '#cfe9f7', minHeight: '100vh' }}>
        <Snapshot subject={{ kind: 'hero', appearance: DEFAULT_APPEARANCE }} px={160} alt="hero" className="w-[160px]" />
        {(['sproutling', 'pebblewing', 'dinobud'] as const).map((m) => (
          <Snapshot key={m} subject={{ kind: 'monster', monster: m }} px={160} alt={m} className="w-[160px] bg-white/40" />
        ))}
        <Snapshot subject={{ kind: 'boss' }} px={160} alt="boss" className="w-[160px] bg-white/40" />
      </main>
    )
  const part = (PART_ORDER.includes(q.get('part') as AppearancePart) ? q.get('part') : 'top') as AppearancePart
  const turn = Number(q.get('turn') ?? 0.5)
  const zoom = Number(q.get('zoom') ?? 60)
  const all = [...APPEARANCE_OPTIONS[part], ...shopValues(part)] as string[]
  const values = q.get('only') ? all.filter((v) => v === q.get('only')) : all
  const cols = Math.min(6, values.length)
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#cfe9f7' }}>
      <p style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, font: '14px sans-serif' }}>{part}: {values.join(', ')}</p>
      <Canvas orthographic camera={{ position: [0, 1.4, 10], zoom }} shadows>
        <hemisphereLight args={['#bfe6ff', '#8bc34a', 1.4]} />
        <directionalLight position={[3, 6, 4]} intensity={2.2} color="#fff1d6" />
        <Suspense fallback={null}>
          {values.map((v, i) => (
            <HeroModel
              key={v}
              appearance={{ ...DEFAULT_APPEARANCE, [part]: v } as Appearance}
              position={values.length === 1 ? [0, -1.15, 0] : [((i % cols) - (cols - 1) / 2) * 2.2, 2.6 - Math.floor(i / cols) * 2.8, 0]}
              rotation={[0, turn, 0]}
              reducedMotion
            />
          ))}
        </Suspense>
      </Canvas>
    </main>
  )
}
