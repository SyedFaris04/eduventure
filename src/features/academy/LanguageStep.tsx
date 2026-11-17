import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, Volume2 } from 'lucide-react'
import { Button } from '../../components/ui'
import { AcademyError, answerStep, type LessonStep, type StepAnswer, type StepResult } from './academyApi'
import { canSpeak, speak, type SpeechLang } from './speech'

type Props = { step: LessonStep; attempt: string; language: SpeechLang; alreadySolved: boolean; last: boolean; finishing: boolean; onError: (k: string | null) => void; onContinue: () => void }

const tileClass = 'min-h-11 rounded-xl border-[3px] border-wood-dark bg-white px-3 py-1.5 font-semibold shadow-[0_3px_0_var(--color-wood-dark)] active:translate-y-[2px] disabled:opacity-40'
const optionClass = (picked: boolean, right: boolean) =>
  `min-h-12 rounded-2xl border-[3px] px-3 py-2 text-start font-semibold ${right ? 'border-grass-dark bg-grass/30' : picked ? 'border-wood-dark bg-gold/40' : 'border-wood/50 bg-white hover:border-wood'}`

function Speak({ text, lang }: { text: string; lang: SpeechLang }) {
  const { t } = useTranslation()
  if (!canSpeak(lang)) return null
  return (
    <button type="button" onClick={() => speak(text, lang)} aria-label={t('academy.play')} className="rounded-full border-[3px] border-wood-dark bg-water/40 p-2">
      <Volume2 aria-hidden />
    </button>
  )
}

/** One Duolingo-style exercise. Everything except word cards is marked by the server. */
export function LanguageStep({ step, attempt, language, alreadySolved, last, finishing, onError, onContinue }: Props) {
  const { t } = useTranslation()
  const [passed, setPassed] = useState(step.kind === 'card' || alreadySolved)
  const [marked, setMarked] = useState<StepResult | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [order, setOrder] = useState<number[]>([]) // build: tile positions in the answer line
  const [pairs, setPairs] = useState<Record<string, string>>({}) // match: left -> right
  const [left, setLeft] = useState<string | null>(null)
  const [typed, setTyped] = useState('')

  // Listening plays its sound once when it appears.
  useEffect(() => {
    if (step.kind === 'listen' && step.say) speak(step.say, language)
  }, [step, language])

  async function mark(answer: StepAnswer) {
    if (busy || passed) return
    setBusy(true)
    onError(null)
    try {
      const r = await answerStep(attempt, step.id, answer)
      setMarked(r)
      if (r.correct) setPassed(true)
    } catch (e) {
      onError(e instanceof AcademyError ? e.key : 'academy.errors.generic')
    } finally {
      setBusy(false)
    }
  }

  const choose = (id: string) => {
    setPicked(id)
    void mark({ choice: id })
  }
  const options = step.options ?? []
  const tiles = step.tiles ?? []
  const lefts = step.pairs?.left ?? []
  const rights = step.pairs?.right ?? []
  const pairedRights = new Set(Object.values(pairs))
  const accepted = marked && !marked.correct && marked.accepted !== null ? (options.find((o) => o.id === marked.accepted)?.text ?? (Array.isArray(marked.accepted) ? (marked.accepted as string[]).join(' ') : String(marked.accepted))) : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <p className="text-lg font-bold text-wood-dark">{step.text}</p>

      {step.kind === 'card' && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border-4 border-wood bg-cream p-6 text-center">
          <span className="text-6xl">{step.emoji}</span>
          <p className="flex items-center gap-2 font-display text-3xl font-bold text-ink">
            {step.word} <Speak text={step.say ?? step.word ?? ''} lang={language} />
          </p>
          <p className="text-xl font-semibold text-wood-dark">{step.meaning}</p>
          {step.note && <p className="text-sm">{step.note}</p>}
        </div>
      )}

      {(step.kind === 'pick' || step.kind === 'gap' || step.kind === 'listen') && (
        <>
          {step.kind === 'pick' && (
            <p className="flex items-center gap-2 rounded-2xl border-[3px] border-wood bg-cream p-3 font-display text-2xl font-bold">
              {step.prompt} {step.say && <Speak text={step.say} lang={language} />}
            </p>
          )}
          {step.kind === 'gap' && <p className="rounded-2xl border-[3px] border-wood bg-cream p-3 font-display text-2xl font-bold">{step.sentence}</p>}
          {step.kind === 'listen' && (
            <div className="flex justify-center">
              <Button variant="secondary" size="lg" onClick={() => speak(step.say ?? '', language)}>
                <Volume2 aria-hidden /> {t('academy.play')}
              </Button>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o) => (
              <button key={o.id} type="button" disabled={busy || passed} onClick={() => choose(o.id)} className={optionClass(picked === o.id, passed && picked === o.id)}>
                {o.text}
              </button>
            ))}
          </div>
        </>
      )}

      {step.kind === 'build' && (
        <>
          <p className="rounded-2xl border-[3px] border-wood bg-cream p-3 font-display text-2xl font-bold">{step.prompt}</p>
          <div role="group" aria-label={t('academy.answerLine')} className="flex min-h-14 flex-wrap gap-2 border-b-[3px] border-wood/40 pb-2">
            {order.map((i) => (
              <button key={i} type="button" disabled={busy || passed} className={tileClass} onClick={() => setOrder((o) => o.filter((x) => x !== i))}>
                {tiles[i]}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t('academy.tray')} className="flex flex-wrap gap-2">
            {tiles.map((w, i) =>
              order.includes(i) ? null : (
                <button key={i} type="button" disabled={busy || passed} className={tileClass} onClick={() => setOrder((o) => [...o, i])}>
                  {w}
                </button>
              ),
            )}
          </div>
          {!passed && (
            <Button onClick={() => void mark({ order: order.map((i) => tiles[i]) })} disabled={busy || order.length === 0}>
              <Check size={18} aria-hidden /> {t('academy.check')}
            </Button>
          )}
        </>
      )}

      {step.kind === 'match' && (
        <>
          <p className="text-sm font-semibold text-wood-dark">{t('academy.matchHint')}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              {lefts.map((l) => (
                <button
                  key={l}
                  type="button"
                  disabled={busy || passed}
                  aria-pressed={left === l}
                  onClick={() => {
                    if (pairs[l]) setPairs(({ [l]: _, ...rest }) => rest) // tapping a paired word breaks the pair
                    else setLeft(l)
                  }}
                  className={optionClass(left === l, Boolean(pairs[l]))}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {rights.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={busy || passed || pairedRights.has(r) || !left}
                  onClick={() => {
                    if (!left) return
                    setPairs((p) => ({ ...p, [left]: r }))
                    setLeft(null)
                  }}
                  className={optionClass(false, pairedRights.has(r))}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {!passed && (
            <Button onClick={() => void mark({ pairs: lefts.map((l) => [l, pairs[l]] as [string, string]) })} disabled={busy || lefts.some((l) => !pairs[l])}>
              <Check size={18} aria-hidden /> {t('academy.check')}
            </Button>
          )}
        </>
      )}

      {step.kind === 'type' && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void mark({ text: typed })
          }}
        >
          <p className="rounded-2xl border-[3px] border-wood bg-cream p-3 font-display text-2xl font-bold">{step.prompt}</p>
          <label htmlFor={`${step.id}-typed`} className="text-sm font-bold text-wood-dark">
            {t('academy.yourAnswer')}
          </label>
          <input
            id={`${step.id}-typed`}
            lang={language === 'english' ? 'en' : 'ms'}
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            value={typed}
            disabled={passed}
            onChange={(e) => setTyped(e.target.value)}
            className="min-h-12 rounded-xl border-[3px] border-wood/60 bg-white px-3 text-lg"
          />
          {!passed && (
            <Button type="submit" disabled={busy || !typed.trim()}>
              <Check size={18} aria-hidden /> {t('academy.check')}
            </Button>
          )}
        </form>
      )}

      {marked && (
        <div role="status" className={`rounded-2xl border-[3px] p-3 ${marked.correct ? 'border-grass-dark bg-grass/20' : 'border-danger bg-danger/10'}`}>
          <p className="font-display font-bold">{marked.correct ? t('academy.correct') : t('academy.wrong')}</p>
          {marked.explanation && <p className="text-sm">{marked.explanation}</p>}
          {accepted && <p className="mt-1 text-sm font-semibold">{t('academy.answerWas', { answer: accepted })}</p>}
        </div>
      )}

      {passed && (
        <div className="flex justify-end">
          <Button onClick={onContinue} disabled={finishing}>
            {last ? t('academy.finish') : t('academy.continue')} <ArrowRight size={18} className="rtl:rotate-180" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}
