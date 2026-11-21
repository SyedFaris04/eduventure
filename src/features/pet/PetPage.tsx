import { supabase } from '../../services/supabase'
import { factText, type Souvenir } from './AdventureCard'
import { playSfx } from '../../audio/engine'
import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Coins, Egg, PawPrint, Sparkles, X } from 'lucide-react'
import { Button, buttonClasses, Paged, Panel, ProgressBar, Select } from '../../components/ui'
import { useShortScreen } from '../../app/useShortScreen'
import { SceneBackdrop } from '../landing/SceneBackdrop'
import { FormMessage } from '../authentication/AuthLayout'
import { useSession } from '../authentication/useSession'
import { useProgression } from '../character/useCharacter'
import { CATALOGUE } from '../shop/catalogue'
import { useOwnedItems } from '../shop/useShop'
import { Snapshot } from '../../world3d/SnapshotImage'
import { unlockLevel } from '../../game/unlocks'
import { BRANCHES, PET_NAMES, PET_SPECIES, petForm, petNext, STEPS, type Pet, type PetSpecies } from './petRules'
import { dressPet, evolvePet, hatchPet, petKey, usePet } from './usePet'

type Slot = 'hat' | 'neck' | 'dye'
const SLOTS: Slot[] = ['hat', 'neck', 'dye']

type ViewProps = {
  level: number
  gold: number
  pet: Pet | null
  owned: Set<string>
  busy: boolean
  onHatch: (species: PetSpecies, name: string) => void
  onEvolve: () => void
  onDress: (slot: Slot, item: string | null) => void
  souvenirs?: Souvenir[]
}

/** Everything on the pet page, from plain values (PetPage wires it to the server). */
export function PetView({ level, gold, pet, owned, busy, onHatch, onEvolve, onDress, souvenirs = [] }: ViewProps) {
  const short = useShortScreen()
  const { t, i18n } = useTranslation()
  const [species, setSpecies] = useState<PetSpecies>('kancil')
  const [name, setName] = useState<string>(PET_NAMES[0])
  const eggLevel = unlockLevel('pet', 'pet_egg')!

  if (!pet) {
    if (level < eggLevel)
      return (
        <Panel className="flex flex-col items-center gap-3 text-center">
          <Egg size={56} className="text-path-dark" aria-hidden />
          <p className="font-display text-xl font-semibold">{t('pet.lockedEgg', { level: eggLevel })}</p>
          <p className="text-sm">{t('pet.howToGrow')}</p>
        </Panel>
      )
    return (
      <Panel className="flex flex-col gap-4 short:grid short:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] short:items-center short:gap-x-3 short:gap-y-2">
        <h2 className="font-display text-xl font-semibold short:col-span-2 short:text-base">{t('pet.chooseEgg')}</h2>
        <div className="grid grid-cols-3 gap-3 short:gap-2">
          {PET_SPECIES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={species === s}
              onClick={() => setSpecies(s)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-[3px] bg-white/85 p-2 font-display font-semibold short:p-1 short:text-xs ${species === s ? 'border-grass-dark' : 'border-wood/30'}`}
            >
              <Snapshot subject={{ kind: 'pet', pet: { species: s, stage: 'baby', form: null, look: {} } }} px={96} alt="" className="w-[96px] short:w-14" />
              {t(`pet.species.${s}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4 short:gap-2">
        <Select label={t('pet.nameLabel')} value={name} onChange={(e) => setName(e.target.value)}>
          {PET_NAMES.map((n) => (
            <option key={n} value={n}>
              {t(`pet.names.${n}`)}
            </option>
          ))}
        </Select>
        <Button size="lg" disabled={busy} onClick={() => onHatch(species, name)}>
          <Egg size={20} aria-hidden /> {t('pet.hatch')}
        </Button>
        </div>
        <p className="text-sm short:hidden">{t('pet.howToGrow')}</p>
      </Panel>
    )
  }

  const next = petNext(pet.stage, pet.points, level, gold)
  const branchTotal = BRANCHES.reduce((s, b) => s + pet.branches[b], 0)
  const petName = t(`pet.names.${pet.name}`)
  const ownedFor = (slot: Slot) => CATALOGUE.filter((i) => i.slot === `pet_${slot}` && owned.has(i.id))

  return (
    // Phones held sideways: two panels per page (the pet and its growth, then souvenirs and dressing up).
    <Paged items={[0, 1, 2, 3]} perPage={short ? 2 : Infinity} label={petName} className="grid gap-5 md:grid-cols-2 short:grid-cols-2 short:gap-3">
      {(n) => (
        <Fragment key={n}>
          {n === 0 && (
            <Panel className="flex flex-col items-center gap-3 text-center">
              <Snapshot subject={{ kind: 'pet', pet }} px={200} alt={petName} className="w-[200px] short:w-28 tiny:w-20" />
              <p className="font-display text-2xl font-bold short:text-lg">{petName}</p>
              <p className="font-semibold text-wood-dark">
                {t(`pet.species.${pet.species}`)} · {t(`pet.stage.${pet.stage}`)}
                {pet.form && ` · ${t(`pet.form.${pet.form}`)}`}
              </p>
              <p className="text-sm short:text-xs tiny:hidden">{t('pet.howToGrow')}</p>
            </Panel>
          )}
          {n === 1 && (
            <Panel className="flex flex-col gap-4">
              {next.next ? (
                <>
                  <p className="font-display text-lg font-semibold">{t('pet.points', { n: pet.points, need: next.points })}</p>
                  <ProgressBar value={pet.points / next.points} label={t('pet.points', { n: pet.points, need: next.points })} />
                  <ul className="flex flex-col gap-1 text-sm font-semibold">
                    {(['points', 'level', 'gold'] as const).map((k) => {
                      const ok = !next.missing.includes(k)
                      return (
                        <li key={k} data-ok={ok} className={`flex items-center gap-2 ${ok ? 'text-grass-dark' : 'text-wood-dark/80'}`}>
                          {ok ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />} {t(`pet.need.${k}`, { n: next[k] })}
                        </li>
                      )
                    })}
                  </ul>
                  <Button size="lg" disabled={busy || next.missing.length > 0} onClick={onEvolve}>
                    <Sparkles size={20} aria-hidden /> {t('pet.evolve', { stage: t(`pet.stage.${next.next}`) })}
                  </Button>
                </>
              ) : (
                <p className="font-display text-lg font-semibold">{t('pet.fullyGrown')}</p>
              )}
              {pet.stage !== 'adult' && (
                <div className="flex flex-col gap-2">
                  {BRANCHES.map((b) => (
                    <div key={b} className="flex items-center gap-2 text-sm font-semibold">
                      <span className="w-24 shrink-0">{t(`pet.branch.${b}`)}</span>
                      <ProgressBar value={branchTotal ? pet.branches[b] / branchTotal : 0} label={`${t(`pet.branch.${b}`)}: ${pet.branches[b]}`} className="h-4! flex-1" />
                    </div>
                  ))}
                  <p className="text-sm font-bold text-path-dark">{t('pet.heading', { form: t(`pet.form.${petForm(pet.branches)}`) })}</p>
                </div>
              )}
            </Panel>
          )}
          {n === 2 && (
            <Panel className="flex flex-col gap-2 md:col-span-2 short:col-span-1">
              <h2 className="font-display text-xl font-semibold">{t('pet.souvenirs', { n: souvenirs.length })}</h2>
              {souvenirs.length === 0 ? (
                <p className="text-sm">{t('pet.noSouvenirs')}</p>
              ) : (
                <Paged list items={souvenirs} perPage={short ? 3 : Infinity} label={t('pet.souvenirs', { n: souvenirs.length })} className="flex flex-col gap-1 text-sm short:text-xs">
                  {(f) => (
                    <li key={f.id} className="rounded-lg bg-white/70 px-2 py-1">
                      <span className="me-1 text-xs font-bold text-path-dark">{t(`regions.${f.island}.name`)} ·</span>
                      {factText(f, i18n.language)}
                    </li>
                  )}
                </Paged>
              )}
            </Panel>
          )}
          {n === 3 && (
            <Panel className="flex flex-col gap-3 md:col-span-2 short:col-span-1">
              <h2 className="font-display text-xl font-semibold">{t('pet.dress')}</h2>
              {SLOTS.every((s) => ownedFor(s).length === 0) && (
                <p className="text-sm">
                  {t('pet.noItems')}{' '}
                  <Link to="/shop" className="font-bold text-water-dark underline">
                    {t('shop.title')}
                  </Link>
                </p>
              )}
              {SLOTS.map((slot) =>
                ownedFor(slot).length === 0 ? null : (
                  <div key={slot} className="flex flex-wrap items-center gap-2">
                    <span className="w-20 font-semibold">{t(`pet.slot.${slot}`)}</span>
                    {ownedFor(slot).map((item) => {
                      const itemName = t(`character.opt.${item.id}`)
                      const wearing = pet.look[slot] === item.id
                      return (
                        <Button
                          key={item.id}
                          variant={wearing ? 'primary' : 'secondary'}
                          disabled={busy}
                          onClick={() => onDress(slot, wearing ? null : item.id)}
                          aria-label={t(wearing ? 'pet.takeOffItem' : 'pet.wearItem', { item: itemName })}
                        >
                          {wearing && <Check size={16} aria-hidden />} {itemName}
                        </Button>
                      )
                    })}
                  </div>
                ),
              )}
            </Panel>
          )}
        </Fragment>
      )}
    </Paged>
  )
}

export function PetPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const uid = session?.user.id
  const progression = useProgression(uid)
  const pet = usePet(uid)
  const owned = useOwnedItems(uid)
  const souvenirs = useQuery({
    queryKey: ['souvenirs', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_souvenirs')
      if (error) throw error
      return data as Souvenir[]
    },
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  async function run(action: () => Promise<unknown>, success?: (r: unknown) => string) {
    setBusy(true)
    setMessage(null)
    try {
      const r = await action()
      await Promise.all([queryClient.invalidateQueries({ queryKey: petKey(uid) }), queryClient.invalidateQueries({ queryKey: ['progression', uid] })])
      if (success) setMessage({ kind: 'success', text: success(r) })
    } catch (e) {
      const m = (e as { message?: string }).message ?? ''
      const key = /pet points/i.test(m) ? 'points' : /reach level/i.test(m) ? 'level' : /enough gold/i.test(m) ? 'gold' : 'failed'
      setMessage({ kind: 'error', text: t(`pet.errors.${key}`) })
    } finally {
      setBusy(false)
    }
  }

  const name = pet.data ? t(`pet.names.${pet.data.name}`) : ''
  return (
    <main className="relative min-h-dvh">
      <SceneBackdrop />
      <div className="relative mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 short:gap-2 short:py-2">
        <header className="flex flex-wrap items-center gap-3">
          <Link to="/world" aria-label={t('common.back')} className={buttonClasses('secondary', 'md', 'px-3!')}>
            <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden />
          </Link>
          <h1 className="flex items-center gap-2 rounded-full bg-cream/90 px-4 py-1 text-2xl font-bold text-wood-dark short:py-0.5 short:text-lg">
            <PawPrint aria-hidden /> {t('pet.title')}
          </h1>
          <p className="ms-auto flex items-center gap-2 rounded-full bg-cream/90 px-4 py-1 font-display text-xl font-bold text-wood-dark">
            <Coins className="text-gold" aria-hidden /> {t('shop.yourGold', { n: progression.data?.gold ?? 0 })}
          </p>
        </header>
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
        {progression.data && pet.data !== undefined && (
          <PetView
            level={progression.data.level}
            gold={progression.data.gold}
            pet={pet.data}
            owned={owned.data ?? new Set()}
            busy={busy}
            souvenirs={souvenirs.data ?? []}
            onHatch={(s, n) => run(() => hatchPet(s, n), () => (playSfx('sparkle'), t('pet.hatched', { name: t(`pet.names.${n}`) })))}
            onEvolve={() => run(evolvePet, () => (playSfx('levelup'), t('pet.evolved', { name, fee: STEPS[pet.data!.stage === 'baby' ? 'young' : 'adult'].gold })))}
            onDress={(slot, item) => run(() => dressPet(slot, item))}
          />
        )}
      </div>
    </main>
  )
}
