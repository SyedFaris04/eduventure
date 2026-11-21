import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, Img, interpolate, OffthreadVideo, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { prog } from '../animations/timing'
import { BODY, C, DISPLAY, H, SAFE, W } from '../styles/theme'

/** Battle and lesson footage as a framed screen, and the caption position above it. */
export const CARD = { scale: 0.78, y: 190 }
export const CAP_Y = 310

/**
 * A recorded clip, muted, filling the frame, with a slow push-in. `from` is the second inside the recording to start
 * at; `focus` sets the zoom centre (0–1). Each clip is real footage from assets/recordings.
 */
export function Clip({ src, from = 0, rate = 1, zoom = [1.02, 1.1], focus = [0.5, 0.5], whip = true, card }: { src: string; from?: number; rate?: number; zoom?: [number, number]; focus?: [number, number]; whip?: boolean; card?: { scale: number; y: number } }) {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()
  const z = interpolate(frame, [0, durationInFrames], zoom)
  const w = whip ? 1 - prog(frame, 0, 7) : 0 // a quick zoom-blur into each cut
  const video = (style: CSSProperties) => (
    <OffthreadVideo src={staticFile(`recordings/${src}.mp4`)} startFrom={Math.round(from * fps)} playbackRate={rate} muted style={{ width: W, height: H, objectFit: 'cover', ...style }} />
  )
  if (card) {
    // Interface-heavy footage as a framed screen over a blurred copy of itself: room above for the caption, and it
    // reads plainly as a real game screen.
    return (
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: C.ink }}>
        {video({ transform: 'scale(1.35)', filter: 'blur(28px) brightness(0.6) saturate(1.2)' })}
        <div
          style={{
            position: 'absolute',
            left: (W * (1 - card.scale)) / 2,
            top: (H * (1 - card.scale)) / 2 + card.y,
            width: W * card.scale,
            height: H * card.scale,
            borderRadius: 40,
            overflow: 'hidden',
            border: `8px solid ${C.ink}`,
            boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
            transform: `scale(${1 + w * 0.06})`,
          }}
        >
          <div style={{ width: W, height: H, transform: `scale(${card.scale})`, transformOrigin: '0 0' }}>{video({ transform: `scale(${z})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%` })}</div>
        </div>
      </AbsoluteFill>
    )
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: C.ink }}>
      {video({ transform: `scale(${z + w * 0.12})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, filter: `blur(${w * 10}px)` })}
    </AbsoluteFill>
  )
}

/** The key art, moved like a camera between keyframes: [frame, centreX px, centreY px, scale] in key-art pixels. */
export function KeyArt({ keys, blur = 0 }: { keys: [number, number, number, number][]; blur?: number }) {
  const frame = useCurrentFrame()
  const at = (i: 1 | 2 | 3) => interpolate(frame, keys.map((k) => k[0]), keys.map((k) => k[i]), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => t * t * (3 - 2 * t) })
  const cx = at(1)
  const cy = at(2)
  const s = at(3)
  // Key art is 1672 × 941; scale 1 = its height fills the frame (1920 / 941).
  const base = H / 941
  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#7cc3ea' }}>
      <Img
        src={staticFile('images/key-art.png')}
        style={{ position: 'absolute', width: 1672 * base * s, height: 941 * base * s, left: W / 2 - cx * base * s, top: H / 2 - cy * base * s, filter: blur ? `blur(${blur}px) saturate(1.1)` : undefined }}
      />
    </AbsoluteFill>
  )
}

/** Floating magic sparkles (deterministic, so every render is identical). */
export function Sparkles({ count = 40, seed = 'spark', color = '#fff7c2', area = [0, 0, W, H] as [number, number, number, number], rise = 260 }: { count?: number; seed?: string; color?: string; area?: [number, number, number, number]; rise?: number }) {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => {
        const x = area[0] + random(`${seed}x${i}`) * (area[2] - area[0])
        const y0 = area[1] + random(`${seed}y${i}`) * (area[3] - area[1])
        const speed = 0.5 + random(`${seed}s${i}`)
        const period = 70 + random(`${seed}p${i}`) * 60
        const t = ((frame * speed + random(`${seed}o${i}`) * period) % period) / period
        const size = 6 + random(`${seed}z${i}`) * 16
        const twinkle = Math.sin(t * Math.PI)
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.sin((frame + i * 13) / 18) * 14,
              top: y0 - t * rise,
              width: size,
              height: size,
              borderRadius: '50%',
              background: `radial-gradient(circle, #fff 0%, ${color} 40%, transparent 70%)`,
              opacity: twinkle,
              transform: `scale(${0.6 + twinkle * 0.6})`,
              boxShadow: `0 0 ${size * 1.5}px ${color}`,
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}

/** Gold coins bursting up and falling, with a "+gold" chip, from a point (px). */
export function CoinBurst({ x, y, delay = 0, n = 14, label }: { x: number; y: number; delay?: number; n?: number; label?: string }) {
  const frame = useCurrentFrame() - delay
  const { fps } = useVideoConfig()
  if (frame < 0) return null
  const chip = spring({ frame, fps, config: { damping: 10, stiffness: 160 } })
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (random(`c${i}`) - 0.5) * 2.2
        const v = 22 + random(`v${i}`) * 18
        const t = frame / fps
        const px = x + Math.cos(a) * v * frame * 0.9
        const py = y + Math.sin(a) * v * frame * 0.9 + 0.5 * 2600 * t * t
        const spin = Math.cos(frame / 3 + i)
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px - 22,
              top: py - 22,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, #fff6b0, ${C.gold} 45%, #c98b12)`,
              border: `4px solid ${C.woodDark}`,
              transform: `scaleX(${Math.abs(spin) * 0.8 + 0.2})`,
              opacity: interpolate(frame, [0, 30, 40], [1, 1, 0], { extrapolateRight: 'clamp' }),
            }}
          />
        )
      })}
      {label ? <Chip text={label} x={x} y={y - 40 - chip * 90} scale={chip} /> : null}
    </AbsoluteFill>
  )
}

export function Chip({ text, x, y, scale = 1, bg = C.gold }: { text: string; x: number; y: number; scale?: number; bg?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        background: bg,
        color: C.ink,
        border: `6px solid ${C.ink}`,
        borderRadius: 999,
        padding: '10px 30px',
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: 54,
        whiteSpace: 'nowrap',
        boxShadow: `0 8px 0 ${C.woodDark}, 0 16px 30px rgba(0,0,0,0.3)`,
      }}
    >
      {text}
    </div>
  )
}

/** XP bar that fills and bursts into LEVEL UP!. */
export function XpBar({ y = 1300, from = 0.55, delay = 0, fillFrames = 22 }: { y?: number; from?: number; delay?: number; fillFrames?: number }) {
  const frame = useCurrentFrame() - delay
  const { fps } = useVideoConfig()
  const fill = from + (1 - from) * prog(frame, 0, fillFrames)
  const burst = spring({ frame: frame - fillFrames, fps, config: { damping: 9, stiffness: 140 } })
  const width = SAFE.right - SAFE.left - 80
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: (W - width) / 2, top: y, width, height: 54, borderRadius: 999, background: C.woodDark, border: `6px solid ${C.ink}`, overflow: 'hidden', boxShadow: '0 10px 24px rgba(0,0,0,0.3)' }}>
        <div style={{ width: `${fill * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.magic}, #c9f0ff)`, boxShadow: 'inset 0 -8px 0 rgba(0,0,0,0.12)' }} />
      </div>
      <div style={{ position: 'absolute', left: (W - width) / 2 - 10, top: y - 70, fontFamily: DISPLAY, fontWeight: 700, fontSize: 48, color: C.cream, WebkitTextStroke: `8px ${C.ink}`, paintOrder: 'stroke fill' }}>XP</div>
      {frame > fillFrames ? <Chip text="LEVEL UP!" x={W / 2} y={y - 130} scale={burst} /> : null}
    </AbsoluteFill>
  )
}

/** Small honest label in the top-left of the safe zone: REAL GAMEPLAY, IN-GAME SCENE, COMING SOON, PLANNED. */
export function Tag({ text, tone = 'real', at = 'bottom' }: { text: string; tone?: 'real' | 'soon' | 'planned'; at?: 'top' | 'bottom' }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - 3, fps, config: { damping: 200 } })
  const bg = tone === 'real' ? C.grass : tone === 'soon' ? C.gold : C.water
  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        top: at === 'top' ? SAFE.top + 20 : SAFE.bottom - 60,
        transform: `translateX(${(1 - s) * -40}px)`,
        opacity: s,
        background: bg,
        color: C.ink,
        border: `4px solid ${C.ink}`,
        borderRadius: 14,
        padding: '6px 18px',
        fontFamily: BODY,
        fontWeight: 800,
        fontSize: 30,
        letterSpacing: 2,
        boxShadow: '0 6px 14px rgba(0,0,0,0.3)',
      }}
    >
      {text}
    </div>
  )
}

/** Darkens the top and bottom so captions read over any footage. */
export function Shade({ top = 0.45, bottom = 0.35 }: { top?: number; bottom?: number }) {
  return <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(20,12,6,${top}) 0%, rgba(20,12,6,0) 30%, rgba(20,12,6,0) 62%, rgba(20,12,6,${bottom}) 100%)` }} />
}

/** A bright flash at the start of a sequence (a cut on a hit). */
export function Flash({ frames = 8, color = '#fffbea' }: { frames?: number; color?: string }) {
  const frame = useCurrentFrame()
  return <AbsoluteFill style={{ backgroundColor: color, opacity: interpolate(frame, [0, frames], [0.85, 0], { extrapolateRight: 'clamp' }) }} />
}

/** Gentle camera shake for battle hits. */
export function Shake({ children, at, strength = 14 }: { children: ReactNode; at: number[]; strength?: number }) {
  const frame = useCurrentFrame()
  const k = at.reduce((m, f) => Math.max(m, frame >= f && frame < f + 8 ? 1 - (frame - f) / 8 : 0), 0)
  return <AbsoluteFill style={{ transform: `translate(${Math.sin(frame * 2.3) * strength * k}px, ${Math.cos(frame * 3.1) * strength * k}px)` }}>{children}</AbsoluteFill>
}

/** A swirling magic portal ring (motion graphic) drawn over the key art's portal. */
export function PortalGlow({ x, y, r = 260, delay = 0 }: { x: number; y: number; r?: number; delay?: number }) {
  const frame = useCurrentFrame() - delay
  const grow = prog(frame, 0, 40)
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x - r,
            top: y - r * 1.25,
            width: r * 2,
            height: r * 2.5,
            borderRadius: '50%',
            border: `${10 - i * 2}px solid rgba(143, 211, 255, ${0.55 - i * 0.12})`,
            boxShadow: `0 0 60px 20px rgba(143,211,255,${0.35 * grow}), inset 0 0 80px rgba(200,240,255,${0.4 * grow})`,
            transform: `rotate(${frame * (2 + i)}deg) scale(${(0.7 + i * 0.12) * (0.6 + grow * 0.4) + Math.sin(frame / 8 + i) * 0.03})`,
            opacity: grow,
          }}
        />
      ))}
    </AbsoluteFill>
  )
}

/** Landscape phone footage (the game plays sideways on phones) inside a simple phone body, over its own blurred copy. */
export function PhoneFrame({ src, from = 0, rate = 1, y = 980 }: { src: string; from?: number; rate?: number; y?: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 120 } })
  const w = 960
  const h = Math.round((w * 498) / 1080)
  const clip = (style: CSSProperties) => <OffthreadVideo src={staticFile(`recordings/${src}.mp4`)} startFrom={Math.round(from * fps)} playbackRate={rate} muted style={style} />
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, overflow: 'hidden' }}>
      {clip({ position: 'absolute', height: H, left: '50%', transform: 'translateX(-50%) scale(1.2)', filter: 'blur(30px) brightness(0.55)' })}
      <div
        style={{
          position: 'absolute',
          left: (W - w) / 2 - 34,
          top: y - h / 2 - 22,
          width: w + 68,
          height: h + 44,
          borderRadius: 56,
          background: '#1c1410',
          border: '6px solid #4a3a2c',
          boxShadow: '0 40px 90px rgba(0,0,0,0.6)',
          transform: `scale(${0.85 + s * 0.15}) rotate(${(1 - s) * -6}deg)`,
          opacity: s,
        }}
      >
        <div style={{ position: 'absolute', left: 34, top: 22, width: w, height: h, borderRadius: 26, overflow: 'hidden' }}>{clip({ width: w, height: h })}</div>
      </div>
    </AbsoluteFill>
  )
}
