import { AbsoluteFill, Audio, Img, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { z } from 'zod'
import { BODY, C, DISPLAY, W } from '../styles/theme'
import { Subline } from './Caption'
import { KeyArt, Sparkles } from './Visuals'

/** Editable in Remotion Studio (right panel) or in Root.tsx. Empty fields are simply not shown. */
export const campaignProps = z.object({
  website: z.string(),
  instagram: z.string(),
  tiktok: z.string(),
  threads: z.string(),
  feedbackForm: z.string(),
  /** A voice-over file in assets/audio (for example 'audio/voiceover-main.mp3'); empty = music and captions only. */
  voiceover: z.string(),
})
export type CampaignProps = z.infer<typeof campaignProps>
export const DEFAULT_PROPS: CampaignProps = {
  website: 'syedfaris04.github.io/eduventure',
  instagram: '',
  tiktok: '',
  threads: '',
  feedbackForm: '',
  voiceover: '',
}

/** Overall level for music and effects: keeps the mix's true peak about 1.5 dB under full scale (no clipping). */
const MASTER = 0.82

/** One sound effect at a frame. */
export function Sfx({ at, src, volume = 0.8 }: { at: number; src: string; volume?: number }) {
  return (
    <Sequence from={at} durationInFrames={150} layout="none">
      <Audio src={staticFile(`audio/sfx/${src}.ogg`)} volume={volume * MASTER} />
    </Sequence>
  )
}

/** Background music with a fade in and a fade out; ducked under an optional voice-over. */
export function Music({ src, from = 0, total, volume = 0.55, fadeIn = 10, fadeOut = 45, duck = false }: { src: string; from?: number; total: number; volume?: number; fadeIn?: number; fadeOut?: number; duck?: boolean }) {
  const { fps } = useVideoConfig()
  return (
    <Audio
      src={staticFile(`audio/music/${src}`)}
      startFrom={Math.round(from * fps)}
      volume={(f) => MASTER * volume * (duck ? 0.55 : 1) * Math.min(1, f / fadeIn) * Math.min(1, Math.max(0, (total - f) / fadeOut))}
    />
  )
}

export function Voiceover({ file }: { file: string }) {
  return file ? <Audio src={staticFile(file)} volume={1} /> : null
}

/** The closing card: logo, tagline, call to action, the real website and its QR code, and any handles that are set. */
export function EndCard({ props, lines }: { props: CampaignProps; lines: [string, string] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const logo = spring({ frame: frame - 2, fps, config: { damping: 10, stiffness: 120 } })
  const qr = spring({ frame: frame - 34, fps, config: { damping: 14 } })
  const handles = [
    props.instagram && `Instagram ${props.instagram}`,
    props.tiktok && `TikTok ${props.tiktok}`,
    props.threads && `Threads ${props.threads}`,
  ].filter(Boolean) as string[]
  return (
    <AbsoluteFill>
      <KeyArt keys={[[0, 390, 290, 1.9], [180, 420, 280, 2.0]]} blur={10} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(59,42,30,0.15), rgba(59,42,30,0.55))' }} />
      <Sparkles count={36} seed="end" />
      <Img
        src={staticFile('logos/eduventure-logo-cutout.png')}
        style={{ filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.45))', position: 'absolute', left: (W - 940) / 2, top: 250, width: 940, transform: `scale(${logo}) rotate(${(1 - logo) * -8}deg)` }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: W,
          top: 660,
          textAlign: 'center',
          fontFamily: BODY,
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: 4,
          color: C.ink,
          opacity: spring({ frame: frame - 14, fps, config: { damping: 200 } }),
        }}
      >
        <span style={{ background: C.gold, border: `4px solid ${C.ink}`, borderRadius: 999, padding: '8px 26px' }}>EARLY ACCESS · FREE · WEB & ANDROID</span>
      </div>
      <Subline text={lines[0]} y={755} size={lines[0].length > 22 ? 44 : 56} delay={18} />
      <Subline text={lines[1]} y={860} size={lines[1].length > 26 ? 38 : 44} delay={24} color={C.gold} />
      <div style={{ position: 'absolute', left: (W - 330) / 2, top: 990, width: 330, height: 330, background: '#fff', borderRadius: 28, border: `8px solid ${C.ink}`, padding: 14, transform: `scale(${qr})`, boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}>
        <Img src={staticFile('images/website-qr.svg')} style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, width: W, top: 1350, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 50, color: C.cream, WebkitTextStroke: `10px ${C.ink}`, paintOrder: 'stroke fill', opacity: qr }}>
        {props.website}
      </div>
      {handles.length || props.feedbackForm ? (
        <div style={{ position: 'absolute', left: 0, width: W, top: 1430, textAlign: 'center', fontFamily: BODY, fontWeight: 800, fontSize: 34, color: C.cream, WebkitTextStroke: `7px ${C.ink}`, paintOrder: 'stroke fill', opacity: qr }}>
          {[...handles, props.feedbackForm && `Feedback: ${props.feedbackForm}`].filter(Boolean).join('  ·  ')}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}

