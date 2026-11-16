import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Dices, RefreshCw, RotateCcw, Save, ShoppingBag } from 'lucide-react'
import { Button, Field, Panel } from '../../components/ui'
import { LanguagePicker } from '../../i18n/LanguagePicker'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { FormMessage } from '../authentication/AuthLayout'
import { ageBandFromBirthYear } from '../authentication/ageBand'
import { useSession } from '../authentication/useSession'
import { useMyProfile } from '../onboarding/useReferenceData'
import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, randomAppearance, shopValues, type Appearance, type AppearancePart } from './appearance'
import { useOwnedItems } from '../shop/useShop'
import { characterDataUri } from './renderCharacterSvg'
import { generateSafeName, nameSchema } from './safeName'
import { saveCharacter, useMyCharacter } from './useCharacter'

const HeroPreview = lazy(() => import('../../world3d/hero/HeroPreview'))

const TABS: { id: string; parts: AppearancePart[] }[] = [
  { id: 'body', parts: ['body', 'skin'] },
  { id: 'hair', parts: ['hairStyle', 'hairColour'] },
  { id: 'face', parts: ['eyes', 'face'] },
  { id: 'outfit', parts: ['top', 'bottom', 'shoes'] },
  { id: 'gear', parts: ['weapon', 'backpack', 'accessory'] },
]
const COLOUR_PARTS: AppearancePart[] = ['skin', 'hairColour']

export function CharacterCreatorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const userId = session?.user.id
  const profile = useMyProfile(userId)
  const existing = useMyCharacter(userId)
  const owned = useOwnedItems(userId)

  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE)
  const [name, setName] = useState('')
  const [tab, setTab] = useState('body')
  const [facing, setFacing] = useState<'front' | 'back'>('front')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  // Guests and under-13 players get generated names only (the database enforces the same rule).
  const band = profile.data ? (profile.data.birth_year === null ? 'unknown' : ageBandFromBirthYear(profile.data.birth_year)) : null
  const safeNamesOnly = band === 'under13' || band === 'unknown'

  useEffect(() => {
    if (existing.data) {
      setAppearance(existing.data.appearance)
      setName(existing.data.name)
    }
  }, [existing.data])
  useEffect(() => {
    if (safeNamesOnly && !name) setName(generateSafeName())
  }, [safeNamesOnly, name])


  async function save() {
    setError(null)
    setNameError(null)
    let finalName = name
    if (!safeNamesOnly) {
      const parsed = nameSchema.safeParse(name)
      if (!parsed.success) {
        setTab('name')
        return setNameError(parsed.error.issues[0].message)
      }
      finalName = parsed.data
    }
    if (!userId) return
    setBusy(true)
    try {
      await saveCharacter(userId, finalName, appearance)
      await queryClient.invalidateQueries({ queryKey: ['character', userId] })
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      navigate('/home', { replace: true })
    } catch (e) {
      const message = (e as { message?: string }).message ?? ''
      setError(/name/i.test(message) ? 'character.errors.nameRejected' : 'character.errors.saveFailed')
    } finally {
      setBusy(false)
    }
  }

  const current = TABS.find((x) => x.id === tab)

  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-4 pb-10">
        <header className="flex items-center justify-between gap-3">
          <h1 className="rounded-full bg-cream/90 px-4 py-1 text-xl font-semibold text-wood-dark">
            {t(existing.data ? 'character.editTitle' : 'character.title')}
          </h1>
          <LanguagePicker />
        </header>

        <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Preview */}
          <section className="flex flex-col items-center gap-3 md:sticky md:top-4 md:self-start" aria-label={t('character.preview')}>
            <div className="relative grid w-full max-w-xs place-items-center pt-2">
              <div aria-hidden className="absolute bottom-3 h-10 w-52 rounded-[50%] bg-grass-dark/70 shadow-[0_6px_0_#4a7a2a]" />
              <div aria-hidden className="absolute bottom-6 h-8 w-44 rounded-[50%] bg-grass" />
              <div role="img" aria-label={t('character.previewAlt', { name: name || '…' })} className="relative aspect-[3/4] w-[min(70vw,240px)]">
                <Suspense fallback={null}>
                  <HeroPreview appearance={appearance} facing={facing} />
                </Suspense>
              </div>
            </div>
            <p className="rounded-full bg-cream px-4 py-1 font-display text-lg font-semibold text-wood-dark shadow-[0_3px_0_var(--color-wood)]">{name || '…'}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => setAppearance(randomAppearance())}>
                <Dices size={18} aria-hidden /> {t('character.randomise')}
              </Button>
              <Button variant="secondary" onClick={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}>
                <RotateCcw size={18} aria-hidden /> {t('character.turn')}
              </Button>
            </div>
            <p className="text-sm font-semibold text-wood-dark">{t('character.allFree')}</p>
          </section>

          {/* Options */}
          <Panel className="flex flex-col gap-4">
            <div role="tablist" aria-label={t('character.title')} className="flex flex-wrap gap-2">
              {[...TABS.map((x) => x.id), 'name'].map((id) => (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded-xl border-2 px-3 py-1.5 font-display font-semibold ${tab === id ? 'border-wood-dark bg-wood text-cream' : 'border-wood/40 bg-white/70 text-wood-dark hover:border-wood'}`}
                >
                  {t(`character.tabs.${id}`)}
                </button>
              ))}
            </div>

            <div role="tabpanel" className="flex flex-col gap-5">
              {current?.parts.map((part) => (
                <fieldset key={part} className="flex flex-col gap-2">
                  <legend className="mb-2 font-display text-lg font-semibold">{t(`character.parts.${part}`)}</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...(APPEARANCE_OPTIONS[part] as readonly string[]), ...shopValues(part).filter((v) => owned.data?.has(v))].map((value, i) => {
                      const on = appearance[part] === value
                      const fromShop = !(APPEARANCE_OPTIONS[part] as readonly string[]).includes(value)
                      const choose = () => setAppearance((a) => ({ ...a, [part]: value }))
                      return COLOUR_PARTS.includes(part) ? (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={on}
                          aria-label={t('character.colour', { n: i + 1 })}
                          onClick={choose}
                          className={`size-11 rounded-full border-[3px] ${on ? 'border-wood-dark ring-4 ring-gold' : 'border-wood/40'}`}
                          style={{ background: value }}
                        />
                      ) : (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={on}
                          aria-label={t(`character.opt.${value}`)}
                          title={t(`character.opt.${value}`)}
                          onClick={choose}
                          className={`relative flex w-[76px] flex-col items-center rounded-2xl border-[3px] bg-white/80 p-1 ${on ? 'border-grass-dark bg-grass/15 ring-2 ring-grass' : 'border-wood/30 hover:border-wood'}`}
                        >
                          {fromShop && <ShoppingBag size={14} className="absolute top-1 end-1 text-wood-dark" aria-label={t('character.fromShop')} />}
                          <img alt="" src={characterDataUri({ ...appearance, [part]: value }, { size: 64 })} className="h-[78px] w-16" loading="lazy" />
                          <span className="line-clamp-1 text-[11px] font-bold text-wood-dark">{t(`character.opt.${value}`)}</span>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              ))}

              {tab === 'name' &&
                (safeNamesOnly ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-ink/75">{t('character.generatedHint')}</p>
                    <div className="flex items-center gap-3">
                      <p aria-live="polite" className="flex-1 rounded-xl border-[3px] border-wood/60 bg-white px-3 py-2 font-display text-xl font-semibold">
                        {name}
                      </p>
                      <Button variant="secondary" onClick={() => setName(generateSafeName())}>
                        <RefreshCw size={18} aria-hidden /> {t('character.reroll')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Field
                    label={t('character.nameLabel')}
                    hint={t('character.nameHint')}
                    value={name}
                    maxLength={16}
                    autoComplete="off"
                    error={nameError ? t(nameError) : undefined}
                    onChange={(e) => setName(e.target.value)}
                  />
                ))}
            </div>

            {error && <FormMessage kind="error">{t(error)}</FormMessage>}
            <Button size="lg" onClick={save} disabled={busy || !profile.data}>
              <Save size={20} aria-hidden /> {busy ? t('common.loading') : t('character.save')}
            </Button>
          </Panel>
        </div>
      </div>
    </main>
  )
}
