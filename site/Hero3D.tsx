import { lazy, Suspense, useState } from 'react'
import { can3D, useInView } from './useInView'
import { Fallback } from './ErrorBoundary'

const HeroScene = lazy(() => import('../src/features/landing/HeroScene'))
const still = `${import.meta.env.BASE_URL}hero.webp`

/** The game's floating island, turning slowly (drag to spin); the loading artwork where 3D isn't drawn. */
export function Hero3D({ hint }: { hint: string }) {
  const { ref, near, visible } = useInView<HTMLDivElement>()
  const [three] = useState(can3D)
  const picture = <img src={still} alt="" className="h-full w-full rounded-3xl border-4 border-wood object-cover shadow-[0_6px_0_var(--color-wood-dark)]" />
  return (
    <div ref={ref} className="scene-3d relative h-[36vh] min-h-56 md:h-[60vh]">
      {three && near ? (
        <Fallback still={picture}>
          <Suspense fallback={picture}>
            <HeroScene spin active={visible} />
          </Suspense>
        </Fallback>
      ) : (
        picture
      )}
      {three && <p className="pointer-events-none absolute -bottom-6 w-full text-center text-sm font-bold text-wood-dark">↻ {hint}</p>}
    </div>
  )
}
