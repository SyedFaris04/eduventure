import { AbsoluteFill, Freeze, Img, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Caption } from '../components/Caption'
import { EndCard, Music, Sfx, VoiceCtx, VoiceLines, Voiceover, type CampaignProps, type VoiceLine } from '../components/EndCard'
import { COPY } from '../copy'
import VO from '../voiceover/ms.json'
import { CAP_Y, CARD, Clip, CoinBurst, Flash, KeyArt, PortalGlow, Shade, Shake, Sparkles, Tag } from '../components/Visuals'
import { W } from '../styles/theme'

/** VIDEO A — the main announcement trailer, 43 s. Storyboard: storyboards/main-trailer.md. Music: Fairy Adventure (140 bpm). */
export const MAIN_FRAMES = 1290

function Logo({ delay = 0 }: { delay?: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 110 } })
  return <Img src={staticFile('logos/eduventure-logo-cutout.png')} style={{ filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.45))', position: 'absolute', left: (W - 980) / 2, top: 380, width: 980, transform: `scale(${s}) rotate(${(1 - s) * -10}deg)` }} />
}

export function MainTrailer(props: CampaignProps) {
  const t = COPY[props.lang]
  const vo = props.lang === 'ms' ? (VO.A as VoiceLine[]) : []
  return (
    <VoiceCtx.Provider value={vo}>
    <AbsoluteFill style={{ backgroundColor: '#1d140d' }}>
      {/* SCENE 1 — the hook (0–4 s): into the portal. */}
      <Sequence durationInFrames={120}>
        <KeyArt keys={[[0, 1515, 370, 2.1], [120, 1512, 372, 2.5]]} />
        <PortalGlow x={540} y={980} r={330} />
        <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 52%, transparent 30%, rgba(10,6,3,0.75) 100%)' }} />
        <Sparkles count={50} seed="hook" color="#bfe9ff" rise={420} />
        <Caption text={t.aHook} y={470} size={118} delay={10} stagger={6} />
      </Sequence>

      {/* SCENE 2 — meet EDUVENTURE (4–9 s): out of the portal, the logo, the tagline. */}
      <Sequence from={120} durationInFrames={150}>
        <KeyArt keys={[[0, 1512, 372, 2.5], [40, 760, 515, 2.25], [150, 735, 520, 2.4]]} />
        <Shade top={0.35} bottom={0.55} />
        <Sparkles count={30} seed="intro" />
        <Flash frames={10} />
        <Sequence from={18}><Caption text={t.aMeet} y={300} size={84} /></Sequence>
        <Sequence from={30}><Logo /></Sequence>
        <Sequence from={70}><Caption text={t.aTagline} y={1330} size={96} stagger={9} /></Sequence>
      </Sequence>

      {/* SCENE 3 — learn through gameplay (9–16 s). Real recordings. */}
      <Sequence from={270} durationInFrames={30}>
        <Clip src="lab-dropin" from={1.4} rate={1.6} zoom={[1, 1.05]} />
        <Flash />
      </Sequence>
      <Sequence from={300} durationInFrames={60}>
        <Clip src="game-battle-1" from={0.2} zoom={[1, 1.04]} focus={[0.5, 0.55]} card={CARD} />
        <Shade top={0.5} bottom={0} />
        <Tag text={t.tagReal} />
        <Caption text={t.aAnswer} y={CAP_Y} size={88} delay={4} />
      </Sequence>
      <Sequence from={360} durationInFrames={60}>
        <Shake at={[8]}>
          <Clip src="game-battle-1" from={3.0} zoom={[1, 1.04]} focus={[0.5, 0.55]} card={CARD} />
        </Shake>
        <Shade top={0.5} bottom={0} />
        <Caption text={t.aDefeat} y={CAP_Y} size={88} delay={2} />
        <CoinBurst x={540} y={1150} delay={12} label={t.coins} />
      </Sequence>
      <Sequence from={420} durationInFrames={60}>
        {/* The real end of the battle that reached level 2: Victory, +105 XP, "Level up! You are now level 2." */}
        <Freeze frame={874}>
          <Clip src="game-levelup" from={0} whip={false} zoom={[1.12, 1.12]} focus={[0.5, 0.86]} />
        </Freeze>
        <Shade top={0.55} bottom={0.2} />
        <Caption plate text={t.levelUp} y={CAP_Y} size={120} delay={2} />
        <Sparkles count={46} seed="lvl" color="#fff3a0" />
      </Sequence>

      {/* SCENE 4 — your character, pet, island (16–24 s). */}
      <Sequence from={480} durationInFrames={75}>
        <Clip src="game-creator" from={0} rate={1.5} zoom={[1.3, 1.38]} focus={[0.5, 0.2]} />
        <Shade top={0.2} bottom={0.6} />
        <Tag text={t.tagReal} at="top" />
        <Caption text={t.aCharacter} y={1330} size={104} />
      </Sequence>
      <Sequence from={555} durationInFrames={60}>
        <Clip src="game-pet" from={1.6} zoom={[1.2, 1.3]} focus={[0.5, 0.28]} />
        <Shade top={0.2} bottom={0.6} />
        <Caption text={t.aPet} y={1330} size={110} />
        <Sparkles count={24} seed="pet" />
      </Sequence>
      <Sequence from={615} durationInFrames={45}>
        <Clip src="game-harvest" from={1.0} rate={1.2} zoom={[1.15, 1.3]} focus={[0.5, 0.45]} />
        <Shade top={0.5} bottom={0.2} />
        <Caption text={t.harvest} y={380} size={96} />
      </Sequence>
      <Sequence from={660} durationInFrames={60}>
        <Clip src="lab-showcase" from={2} rate={1.2} zoom={[1, 1.08]} />
        <Shade top={0.5} bottom={0.2} />
        <Tag text={t.tagBuild} />
        <Caption text={t.buildIsland} y={400} size={104} />
      </Sequence>

      {/* SCENE 5 — together (24–32 s). Camps are live; multiplayer is built and labelled COMING SOON. */}
      {(['lab-science', 'lab-maths', 'lab-tech', 'lab-language'] as const).map((src, i) => (
        <Sequence key={src} from={720 + i * 15} durationInFrames={15}>
          <Clip src={src} from={2.5} zoom={[1.05, 1.1]} whip={false} />
        </Sequence>
      ))}
      <Sequence from={720} durationInFrames={60}>
        <Shade top={0.5} bottom={0} />
        <Caption text={t.aIslands} y={400} size={100} />
      </Sequence>
      <Sequence from={780} durationInFrames={65}>
        <Clip src="lab-camp" from={1} zoom={[1.02, 1.1]} />
        <Shade top={0.5} bottom={0} />
        <Tag text={t.tagWorld} />
        <Caption text={t.camps} y={400} size={98} />
      </Sequence>
      <Sequence from={845} durationInFrames={65}>
        <Clip src="game-multiplayer" from={0.2} zoom={[1.2, 1.35]} focus={[0.42, 0.42]} />
        <Shade top={0.5} bottom={0} />
        <Tag text={t.tagSoon} tone="soon" />
        <Caption text={t.aFriends} y={400} size={104} />
      </Sequence>
      {(['lab-kampung-raya', 'lab-kampung-cny', 'lab-kampung-deepavali'] as const).map((src, i) => (
        <Sequence key={src} from={910 + i * 17} durationInFrames={i === 2 ? 16 : 17}>
          <Clip src={src} from={2} zoom={[1.05, 1.12]} whip={false} />
        </Sequence>
      ))}
      <Sequence from={910} durationInFrames={50}>
        <Shade top={0.5} bottom={0} />
        <Caption text={t.aCelebrate} y={400} size={100} />
      </Sequence>

      {/* SCENE 6 — the invitation (32–43 s), slower. */}
      <Sequence from={960} durationInFrames={130}>
        <Clip src="lab-kampung" from={0.5} rate={0.85} zoom={[1, 1.12]} />
        <Shade top={0.55} bottom={0.45} />
        <Sparkles count={30} seed="cta" />
        <Tag text={t.tagPlanned} tone="planned" />
        <Sequence durationInFrames={65}><Caption text={t.aDifferent} y={520} size={96} stagger={5} outAt={8} /></Sequence>
        <Sequence from={65}><Caption text={t.aPartOf} y={520} size={96} stagger={5} /></Sequence>
      </Sequence>
      <Sequence from={1090}>
        <Flash frames={12} />
        <EndCard props={props} lines={t.aEnd} badge={t.badge} />
      </Sequence>

      {/* Sound: music builds from its quiet intro; effects on the hits. */}
      <Music src="fairy-adventure.ogg" total={MAIN_FRAMES} volume={0.6} duck={Boolean(props.voiceover)} lines={vo} />
      <Voiceover file={props.voiceover} />
      <VoiceLines lines={vo} />
      <Sfx at={0} src="portal" volume={0.7} />
      <Sfx at={108} src="whoosh" volume={0.7} />
      <Sfx at={150} src="gong" volume={0.5} />
      <Sfx at={190} src="pop" />
      <Sfx at={199} src="pop" />
      <Sfx at={208} src="pop" />
      <Sfx at={217} src="pop" />
      <Sfx at={270} src="whoosh" volume={0.6} />
      <Sfx at={333} src="tap" />
      <Sfx at={362} src="correct" />
      <Sfx at={366} src="slash" />
      <Sfx at={368} src="hit" volume={0.6} />
      <Sfx at={372} src="coins" />
      <Sfx at={428} src="sparkle" />
      <Sfx at={448} src="levelup" volume={0.9} />
      <Sfx at={480} src="whoosh" volume={0.5} />
      <Sfx at={597} src="sparkle" />
      <Sfx at={619} src="slash" />
      <Sfx at={635} src="slash" />
      <Sfx at={650} src="pop" />
      <Sfx at={660} src="plop" />
      <Sfx at={720} src="whoosh" volume={0.5} />
      <Sfx at={780} src="bell" volume={0.5} />
      <Sfx at={860} src="pop" />
      <Sfx at={1090} src="finale" volume={0.9} />
      <Sfx at={1098} src="sparkle" />
    </AbsoluteFill>
    </VoiceCtx.Provider>
  )
}
