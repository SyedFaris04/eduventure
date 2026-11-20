import { lazy, Suspense, useState } from 'react'
import { RotateCcw, Sparkles } from 'lucide-react'
import { buttonClasses } from '../../src/components/ui/Button'
import type { SiteCopy } from '../App'
import { PetStill, type PetStage } from '../Still'
import { can3D, useInView } from '../useInView'
import { card, Section } from './Section'
import { Fallback } from '../ErrorBoundary'

const PetScene = lazy(() => import('../three/PetScene'))
const STAGES: PetStage[] = ['egg', 'baby', 'young', 'adult']

/** The knowledge pet from egg to adult, one tap at a time. */
export function MeetPet({ t }: { t: SiteCopy }) {
  const [i, setI] = useState(0)
  const [three] = useState(can3D)
  const { ref, near, visible } = useInView<HTMLDivElement>()
  const stage = STAGES[i]
  const label = t.pet.stages[stage]
  const still = <PetStill stage={stage} label={label} />
  const last = i === STAGES.length - 1

  return (
    <Section id="pet" title={t.pet.title} lead={t.pet.lead}>
      <div ref={ref} className={`${card} mx-auto flex max-w-md flex-col items-center gap-3 p-6`}>
        <div className="scene-3d h-56 w-full">{three && near ? <Fallback still={still}><Suspense fallback={still}><PetScene stage={stage} active={visible} /></Suspense></Fallback> : still}</div>
        <ol className="flex gap-2" aria-label={t.pet.title}>
          {STAGES.map((s, k) => (
            <li key={s} aria-current={k === i ? 'step' : undefined} className={`rounded-full border-2 px-3 py-0.5 text-sm font-bold ${k === i ? 'border-wood-dark bg-gold' : 'border-wood/40 bg-white'}`}>
              {t.pet.stages[s]}
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setI(last ? 0 : i + 1)} className={buttonClasses(last ? 'secondary' : 'primary', 'md')}>
          {last ? <RotateCcw size={18} aria-hidden /> : <Sparkles size={18} aria-hidden />} {last ? t.pet.reset : t.pet.evolve}
        </button>
      </div>
    </Section>
  )
}
