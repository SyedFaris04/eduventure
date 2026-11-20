import { lazy, Suspense, useState } from 'react'
import { Gamepad2, RotateCcw } from 'lucide-react'
import { buttonClasses } from '../../src/components/ui/Button'
import type { SiteCopy } from '../App'
import type { Lang } from '../copy'
import { PLAY_URL } from '../links'
import { answer, QUESTIONS, START } from '../quiz'
import { MonsterStill } from '../Still'
import { can3D, useInView } from '../useInView'
import { card, Section } from './Section'
import { Fallback } from '../ErrorBoundary'

const MonsterScene = lazy(() => import('../three/MonsterScene'))

/** A taste of a battle: three questions; right answers hit the Sproutling, wrong ones explain why. */
export function TryQuestion({ t, lang }: { t: SiteCopy; lang: Lang }) {
  const [s, setS] = useState(START)
  const [three] = useState(can3D)
  const { ref, near, visible } = useInView<HTMLDivElement>()
  const hits = START.hp - s.hp
  const q = QUESTIONS[Math.min(s.index, QUESTIONS.length - 1)]
  const still = <MonsterStill hits={hits} label="Sproutling" />

  return (
    <Section id="try" title={t.quiz.title} lead={t.quiz.lead} tint="bg-grass/15">
      <div className={`${card} mx-auto grid max-w-4xl gap-4 p-4 md:grid-cols-[1fr_1.4fr] md:p-6`}>
        <div ref={ref}>
          <div className="scene-3d h-56">{three && near ? <Fallback still={still}><Suspense fallback={still}><MonsterScene hits={hits} active={visible} /></Suspense></Fallback> : still}</div>
          <p className="text-center text-sm font-bold text-wood-dark">{t.quiz.health}</p>
          <div role="meter" aria-label={t.quiz.health} aria-valuemin={0} aria-valuemax={START.hp} aria-valuenow={s.hp} className="mx-auto mt-1 h-4 max-w-xs overflow-hidden rounded-full border-2 border-wood-dark bg-wood-dark/70">
            <div className="h-full bg-gradient-to-r from-danger to-[#ff8a65] transition-[width] duration-500" style={{ width: `${(s.hp / START.hp) * 100}%` }} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {s.done ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <p role="status" className="font-display text-2xl font-bold text-grass-dark">🎉 {t.quiz.done}</p>
              <a href={PLAY_URL} className={buttonClasses('primary', 'lg')}>
                <Gamepad2 aria-hidden /> {t.quiz.cta}
              </a>
              <button type="button" onClick={() => setS(START)} className={buttonClasses('ghost', 'md')}>
                <RotateCcw size={18} aria-hidden /> {t.quiz.again}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-wood-dark">
                {s.index + 1} / {QUESTIONS.length}
              </p>
              <p className="font-display text-xl font-bold">{q.prompt[lang]}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options[lang].map((o, i) => {
                  const chosenRight = s.last === 'right' && i === q.answer
                  return (
                    <button
                      key={o}
                      type="button"
                      disabled={s.last === 'right'}
                      onClick={() => setS(answer(s, i))}
                      className={`min-h-12 rounded-2xl border-[3px] px-4 text-start font-semibold transition-colors ${chosenRight ? 'border-grass-dark bg-grass/40' : 'border-wood/50 bg-white hover:border-wood'}`}
                    >
                      <span className="me-2 inline-grid size-7 place-items-center rounded-full bg-wood-dark text-sm font-bold text-cream">{String.fromCharCode(65 + i)}</span>
                      {o}
                    </button>
                  )
                })}
              </div>
              {s.last && (
                <div role="status" className={`rounded-2xl border-2 p-3 ${s.last === 'right' ? 'border-grass-dark bg-grass/20' : 'border-danger bg-danger/10'}`}>
                  <p className="font-bold">{s.last === 'right' ? t.quiz.right : t.quiz.wrong}</p>
                  <p className="text-sm">
                    <b>{t.quiz.why}:</b> {q.why[lang]}
                  </p>
                </div>
              )}
              {s.last === 'right' && (
                <button type="button" onClick={() => setS(answer(s, 'next'))} className={buttonClasses('primary', 'md', 'self-start')}>
                  {t.quiz.next} →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Section>
  )
}
