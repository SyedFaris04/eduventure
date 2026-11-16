import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Swords } from 'lucide-react'
import { pressInteract, useGame } from '../../game/store'

const coarse = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

/** Virtual joystick (touch screens only). Writes a screen-space vector the game reads every frame. */
export function Joystick() {
  const { t } = useTranslation()
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [show] = useState(coarse)

  useEffect(() => () => useGame.setState({ stick: { x: 0, y: 0 } }), [])
  if (!show) return null

  const R = 48
  const move = (e: PointerEvent) => {
    const rect = base.current!.getBoundingClientRect()
    let x = e.clientX - (rect.left + rect.width / 2)
    let y = e.clientY - (rect.top + rect.height / 2)
    const d = Math.hypot(x, y)
    if (d > R) {
      x = (x / d) * R
      y = (y / d) * R
    }
    setKnob({ x, y })
    const dead = d < 8
    useGame.setState({ stick: dead ? { x: 0, y: 0 } : { x: x / R, y: y / R } })
  }
  const end = () => {
    setKnob({ x: 0, y: 0 })
    useGame.setState({ stick: { x: 0, y: 0 } })
  }

  return (
    <div
      ref={base}
      role="presentation"
      aria-label={t('world.joystick')}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={(e) => e.buttons && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
      className="pointer-events-auto absolute start-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 grid size-32 touch-none place-items-center rounded-full border-[3px] border-wood/70 bg-cream/45"
    >
      <div
        className="size-14 rounded-full border-[3px] border-wood-dark bg-gradient-to-b from-cream to-path shadow-[0_3px_0_var(--color-wood-dark)]"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}

/** Interact: a big button on touch screens, a key hint on desktop. Hidden when there is nothing nearby. */
export function InteractButton() {
  const { t } = useTranslation()
  const prompt = useGame((s) => s.prompt)
  const busy = useGame((s) => Boolean(s.dialogue || s.battle))
  if (!prompt || busy) return null
  const name = prompt.kind === 'npc' ? t(`npc.${prompt.id}.name`) : t(`monsters.${prompt.monster}.name`)
  const label = prompt.kind === 'npc' ? t('world.talkTo', { name }) : t('world.battle', { name })
  const Icon = prompt.kind === 'npc' ? MessageCircle : Swords

  return (
    <button
      type="button"
      onClick={pressInteract}
      className="pointer-events-auto absolute end-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-2 rounded-full border-[3px] border-wood-dark bg-gradient-to-b from-gold to-path-dark px-5 py-3 font-display text-lg font-semibold text-ink shadow-[0_4px_0_var(--color-wood-dark)] active:translate-y-0.5 md:start-1/2 md:end-auto md:-translate-x-1/2 md:rtl:translate-x-1/2"
    >
      <Icon size={22} aria-hidden /> {label}
      <kbd className="hidden rounded-md border-2 border-wood-dark bg-cream px-1.5 text-sm md:inline">E</kbd>
    </button>
  )
}
