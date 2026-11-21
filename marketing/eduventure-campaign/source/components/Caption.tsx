import { spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, DISPLAY, SAFE, W } from '../styles/theme'

type Props = {
  /** Words appear one by one; wrap a word in *stars* to colour it gold. */
  text: string
  /** Vertical centre of the text block, in px (kept inside the social safe zone). */
  y?: number
  size?: number
  /** Frames between words. */
  stagger?: number
  /** Frames before the first word. */
  delay?: number
  /** Frames from the end of the sequence at which the caption pops out (0 = stays). */
  outAt?: number
  color?: string
  accent?: string
  /** A soft dark plate behind the words, for busy footage. */
  plate?: boolean
}

/** Big game-style title: each word pops in on a spring, cream fill with a thick ink outline and a soft drop shadow. */
export function Caption({ text, y = 760, size = 104, stagger = 4, delay = 0, outAt, color = C.cream, accent = C.gold, plate = false }: Props) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const words = text.split(' ')
  const out = outAt ? spring({ frame: frame - (durationInFrames - outAt), fps, config: { damping: 200 }, durationInFrames: 8 }) : 0
  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        width: SAFE.right - SAFE.left,
        top: y,
        transform: `translateY(-50%) scale(${1 - out * 0.15})`,
        opacity: 1 - out,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: size * 0.28,
        rowGap: size * 0.02,
        textAlign: 'center',
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.05,
        letterSpacing: 1,
        ...(plate ? { background: 'radial-gradient(ellipse at center, rgba(25,15,8,0.62) 0%, rgba(25,15,8,0.45) 55%, rgba(25,15,8,0) 75%)', padding: '60px 10px' } : {}),
      }}
    >
      {words.map((raw, i) => {
        // A gold phrase runs from a word starting with * to a word ending with * (it can span several words).
        const opens = words.slice(0, i + 1).filter((w) => w.startsWith('*')).length
        const closes = words.slice(0, i).filter((w) => w.endsWith('*')).length
        const gold = opens > closes
        const word = raw.replace(/^\*|\*$/g, '')
        const s = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 11, stiffness: 170, mass: 0.6 } })
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              color: gold ? accent : color,
              transform: `translateY(${(1 - s) * 60}px) scale(${0.4 + s * 0.6}) rotate(${(1 - s) * (i % 2 ? 6 : -6)}deg)`,
              opacity: Math.min(1, s * 1.6),
              WebkitTextStroke: `${Math.round(size * 0.12)}px ${C.ink}`,
              paintOrder: 'stroke fill',
              textShadow: `0 ${size * 0.08}px 0 ${C.woodDark}, 0 ${size * 0.16}px ${size * 0.3}px rgba(0,0,0,0.35)`,
            }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}

/** A smaller line of body copy (for the end card and explanations). */
export function Subline({ text, y, size = 46, delay = 0, color = C.cream }: { text: string; y: number; size?: number; delay?: number; color?: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } })
  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        width: W - SAFE.left * 2 - 60,
        top: y,
        textAlign: 'center',
        fontFamily: "'Nunito', sans-serif",
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.2,
        color,
        opacity: s,
        transform: `translateY(${(1 - s) * 24}px)`,
        WebkitTextStroke: `${Math.round(size * 0.1)}px ${C.ink}`,
        paintOrder: 'stroke fill',
        textShadow: '0 6px 16px rgba(0,0,0,0.35)',
      }}
    >
      {text}
    </div>
  )
}
