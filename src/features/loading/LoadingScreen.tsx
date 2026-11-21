import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Star, Volume2, VolumeX } from 'lucide-react'
import { ProgressBar } from '../../components/ui'
import { runBootTasks, type BootTask } from '../../app/boot'
import { Leaves } from './Leaves'
import { AMBIENT, ART, CHARACTERS, PAINTED, cutoutBackground, placeAt, type CharacterId, type Rect } from './hotspots'
import { getSoundEnabled, playChime, setSoundEnabled } from './sound'
import './loading.css'
import { isPhone, lockLandscape } from '../../app/orientation'

const REACTION: Record<CharacterId, { anim: string; emoji: string }> = {
  boy: { anim: 'react-hop', emoji: '⭐' },
  girl: { anim: 'react-bob', emoji: '✨' },
  cat: { anim: 'react-wiggle', emoji: '💖' },
  slime: { anim: 'react-squish', emoji: '💧' },
  dino: { anim: 'react-nod', emoji: '🎵' },
}

type Particle = { id: number; who: CharacterId; dx: number; delay: number }
type Props = { tasks: BootTask[]; onDone: (result: { failed: string[] }) => void }

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const debug = new URLSearchParams(window.location.search).has('debug')

export function LoadingScreen({ tasks, onDone }: Props) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ failed: string[] } | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [soundOn, setSoundOn] = useState(getSoundEnabled)
  const [reactions, setReactions] = useState<Partial<Record<CharacterId, number>>>({})
  const [particles, setParticles] = useState<Particle[]>([])
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const nextParticle = useRef(0)

  useEffect(() => {
    let cancelled = false // StrictMode runs effects twice in dev; only the live run may report
    runBootTasks(tasks, (f) => !cancelled && setProgress(f)).then((r) => !cancelled && setResult(r))
    return () => {
      cancelled = true
    }
  }, [tasks])

  const ready = result !== null
  const pct = Math.round(progress * 100)

  function start() {
    if (!result || leaving) return
    // Phones play sideways: a tap is when browsers allow full screen and the landscape lock.
    if (isPhone({ width: innerWidth, height: innerHeight, coarse: matchMedia?.('(pointer: coarse)').matches ?? false })) void lockLandscape()
    playChime('done')
    setLeaving(true)
    setTimeout(() => onDone(result), prefersReducedMotion() ? 0 : 500)
  }

  function react(who: CharacterId) {
    playChime(who === 'slime' ? 'pop' : 'tap')
    setReactions((r) => ({ ...r, [who]: (r[who] ?? 0) + 1 }))
    if (prefersReducedMotion()) return
    const burst = Array.from({ length: 5 }, (_, i) => ({
      id: nextParticle.current++,
      who,
      dx: (i - 2) * 22 + Math.round(Math.random() * 10 - 5),
      delay: i * 60,
    }))
    setParticles((p) => [...p, ...burst])
    setTimeout(() => setParticles((p) => p.filter((x) => !burst.includes(x))), 1400)
  }

  function toggleSound() {
    const on = !soundOn
    setSoundEnabled(on)
    setSoundOn(on)
    if (on) playChime('tap') // this click is the gesture that unlocks audio
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || prefersReducedMotion()) return
    setTilt({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 })
  }

  const soundButton = (className: string, style?: CSSProperties) => (
    <button
      type="button"
      aria-pressed={soundOn}
      aria-label={t('common.sound')}
      onClick={(e) => {
        e.stopPropagation()
        toggleSound()
      }}
      style={style}
      className={`grid place-items-center rounded-full border-[3px] border-wood-dark bg-gradient-to-b from-path to-path-dark text-wood-dark shadow-[0_3px_0_var(--color-wood-dark),inset_0_2px_0_rgb(255_255_255/0.5)] active:translate-y-0.5 ${className}`}
    >
      {soundOn ? <Volume2 className="size-[55%]" /> : <VolumeX className="size-[55%]" />}
    </button>
  )

  return (
    <div
      className={`fixed inset-0 overflow-hidden bg-wood-dark select-none transition-opacity duration-500 ${leaving ? 'opacity-0' : 'fade-in'} ${ready ? 'cursor-pointer' : ''}`}
      onPointerMove={onPointerMove}
      onClick={ready ? start : undefined}
    >
      <h1 className="sr-only">{t('common.appName')}</h1>

      {/* Blurred copy fills any letterbox space around the fitted art. */}
      <img src={ART.webp} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover blur-2xl brightness-75" />

      <div className="art-box">
        <div className="parallax" style={{ transform: `translate(${tilt.x * -10}px, ${tilt.y * -6}px)` }}>
          <picture>
            <source srcSet={ART.webp} type="image/webp" />
            <img src={ART.png} alt={t('loading.artAlt')} draggable={false} className="absolute inset-0 size-full" />
          </picture>

          <div aria-hidden className="portal-glow pointer-events-none rounded-full" style={placeAt(AMBIENT.portal)} />
          <div aria-hidden className="pointer-events-none" style={placeAt(AMBIENT.airship)}>
            <div className="cutout idle-rock" style={cutoutBackground(AMBIENT.airship)} />
          </div>

          {/* Live bar, percentage, tip and sound drawn exactly over their painted versions (landscape). */}
          <div className="portrait:hidden">
            <div style={placeAt(PAINTED.bar)} className="rounded-full bg-gradient-to-b from-wood to-wood-dark p-[0.55cqh] shadow-[0_0.4cqh_0_rgb(59_42_30/0.6)]">
              <ProgressBar value={progress} label={t('loading.progressLabel')} className="h-full! bg-[#3d2616]! border-[0.35cqh]! p-[0.35cqh]!" />
            </div>
            <div
              style={placeAt(PAINTED.percent)}
              aria-hidden
              className="grid place-items-center rounded-[1.4cqh] border-[0.35cqh] border-wood-dark bg-gradient-to-b from-wood to-wood-dark font-display text-[4.2cqh] font-bold text-gold [paint-order:stroke_fill] [-webkit-text-stroke:0.5cqh_#3b2a1e]"
            >
              {pct}%
            </div>
            <TipStrip ready={ready} onStart={start} style={placeAt(PAINTED.tip)} className="text-[2.35cqh]" />
            {soundButton('', placeAt(PAINTED.sound))}
          </div>

          {(Object.keys(CHARACTERS) as CharacterId[]).map((who) => (
            <CharacterHotspot
              key={who}
              who={who}
              rect={CHARACTERS[who]}
              label={t(`loading.react.${who}`)}
              reactionCount={reactions[who] ?? 0}
              particles={particles.filter((p) => p.who === who)}
              onReact={react}
            />
          ))}

          {debug && <DebugOutlines />}
        </div>
        <div className="pointer-events-none absolute inset-0" style={{ transform: `translate(${tilt.x * -22}px, ${tilt.y * -14}px)` }}>
          <Leaves />
        </div>
      </div>

      {/* Portrait phones: the painted UI scrolls out of view, so the live UI sits in a bottom panel. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-3xl border-t-4 border-wood bg-wood-dark/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-cream shadow-[0_-8px_24px_rgb(0_0_0/0.3)] landscape:hidden">
        <div className="flex items-center gap-3">
          <p className="flex-1 font-display text-lg font-semibold">{t('loading.title')}</p>
          {soundButton('size-11 shrink-0')}
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar value={progress} label={t('loading.progressLabel')} className="flex-1" />
          <span aria-hidden className="w-14 text-end font-display text-2xl font-bold text-gold">
            {pct}%
          </span>
        </div>
        <TipStrip ready={ready} onStart={start} className="min-h-12 text-sm" />
      </div>
    </div>
  )
}

function TipStrip({ ready, onStart, style, className = '' }: { ready: boolean; onStart: () => void; style?: CSSProperties; className?: string }) {
  const { t } = useTranslation()
  const items = useMemo(() => {
    const tips = t('loading.tips', { returnObjects: true }) as string[]
    const facts = t('loading.facts', { returnObjects: true }) as string[]
    const mixed = facts.flatMap((f, i) => [
      { label: t('loading.factLabel'), text: f },
      ...(tips[i] ? [{ label: t('loading.tipLabel'), text: tips[i] }] : []),
    ])
    return mixed
  }, [t])
  const [index, setIndex] = useState(() => Math.floor(Math.random() * items.length))

  useEffect(() => {
    if (ready) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000)
    return () => clearInterval(id)
  }, [ready, items.length])

  const frame = `flex items-center gap-[0.6em] rounded-full border-[3px] border-wood-dark bg-gradient-to-b from-wood to-wood-dark px-[1em] text-cream shadow-[inset_0_2px_0_rgb(255_255_255/0.15)] ${className}`

  if (ready) {
    return (
      <button
        type="button"
        autoFocus
        onClick={(e) => {
          e.stopPropagation()
          onStart()
        }}
        style={style}
        className={`${frame} pulse-soft justify-center font-display font-semibold text-gold`}
      >
        <Play className="size-[1.2em] fill-current" /> {t('loading.tapToStart')}
      </button>
    )
  }

  const item = items[index % items.length]
  return (
    <div style={style} className={frame} aria-live="polite">
      <Star className="size-[1.2em] shrink-0 fill-gold text-gold" aria-hidden />
      <p key={index} className="fade-in line-clamp-2 leading-tight">
        <strong className="font-display text-gold">{item.label}</strong> {item.text}
      </p>
    </div>
  )
}

type HotspotProps = {
  who: CharacterId
  rect: Rect
  label: string
  reactionCount: number
  particles: Particle[]
  onReact: (who: CharacterId) => void
}

function CharacterHotspot({ who, rect, label, reactionCount, particles, onReact }: HotspotProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onReact(who)
      }}
      style={placeAt(rect)}
      className="group cursor-pointer rounded-[40%]"
    >
      <div className={`absolute inset-0 origin-bottom ${who === 'dino' ? 'idle-breathe' : ''}`}>
        <div
          key={reactionCount}
          className={`cutout transition-[filter] group-hover:brightness-110 ${reactionCount ? REACTION[who].anim : ''}`}
          style={cutoutBackground(rect)}
        />
      </div>
      {particles.map((p) => (
        <span key={p.id} aria-hidden className="particle text-[3.5cqh]" style={{ '--dx': `${p.dx}px`, animationDelay: `${p.delay}ms` } as CSSProperties}>
          {REACTION[who].emoji}
        </span>
      ))}
    </button>
  )
}

function DebugOutlines() {
  const all = { ...CHARACTERS, ...AMBIENT, ...PAINTED }
  return (
    <>
      {Object.entries(all).map(([name, r]) => (
        <div key={name} style={placeAt(r)} className="pointer-events-none border-2 border-dashed border-fuchsia-500">
          <span className="bg-fuchsia-500 px-1 text-xs text-white">{name}</span>
        </div>
      ))}
    </>
  )
}
