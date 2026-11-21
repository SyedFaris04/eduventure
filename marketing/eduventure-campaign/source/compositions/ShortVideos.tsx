import { AbsoluteFill, Freeze, Sequence } from 'remotion'
import { Caption, Subline } from '../components/Caption'
import { EndCard, Music, Sfx, VoiceLines, Voiceover, type CampaignProps, type VoiceLine } from '../components/EndCard'
import { COPY } from '../copy'
import VO from '../voiceover/ms.json'
import { CAP_Y, CARD, Clip, CoinBurst, Flash, KeyArt, PhoneFrame, Shade, Shake, Sparkles, Tag } from '../components/Visuals'
import { C } from '../styles/theme'

// Three shorter videos, each with its own hook and angle (storyboards in storyboards/main-trailer.md).

/** VIDEO B — the learning experience, 25 s. Music: Plains Stage (125 bpm). */
export const LEARNING_FRAMES = 750
export function LearningVideo(props: CampaignProps) {
  const t = COPY[props.lang]
  const vo = props.lang === 'ms' ? (VO.B as VoiceLine[]) : []
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <Sequence durationInFrames={90}>
        <Clip src="game-battle-2" from={1.7} rate={0.6} zoom={[1, 1.04]} focus={[0.5, 0.55]} card={CARD} whip={false} />
        <Shade top={0.6} bottom={0.3} />
        <Caption plate text={t.bHook} y={420} size={108} delay={4} stagger={5} />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <Clip src="game-battle-1" from={1.2} zoom={[1, 1.04]} focus={[0.5, 0.55]} card={CARD} />
        <Shade top={0.55} bottom={0} />
        <Tag text={t.tagReal} />
        <Caption text={t.bReal} y={CAP_Y} size={88} />
      </Sequence>
      <Sequence from={180} durationInFrames={90}>
        <Clip src="game-battle-2" from={2.4} zoom={[1, 1.04]} focus={[0.5, 0.55]} card={CARD} />
        <Shade top={0.55} bottom={0} />
        <Caption text={t.bWrong} y={CAP_Y} size={88} />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <Shake at={[10]}>
          <Clip src="game-battle-1" from={3.0} zoom={[1, 1.04]} focus={[0.5, 0.55]} card={CARD} />
        </Shake>
        <Shade top={0.55} bottom={0} />
        <Caption text={t.bRight} y={CAP_Y} size={88} />
        <CoinBurst x={540} y={1150} delay={14} label={t.coins} />
      </Sequence>
      <Sequence from={360} durationInFrames={90}>
        <Clip src="game-levelup" from={26.6} zoom={[1, 1.04]} focus={[0.5, 0.55]} card={CARD} />
        <Sequence from={45}>
          <Freeze frame={874}>
            <Clip src="game-levelup" from={0} whip={false} zoom={[1.12, 1.12]} focus={[0.5, 0.86]} />
          </Freeze>
          <Sparkles count={40} seed="lvlb" color="#fff3a0" />
        </Sequence>
        <Shade top={0.55} bottom={0.2} />
        <Caption plate text={t.levelUp} y={CAP_Y} size={110} />
      </Sequence>
      <Sequence from={450} durationInFrames={90}>
        <Clip src="game-code" from={0.8} rate={2} zoom={[1.0, 1.04]} focus={[0.5, 0]} whip={false} />
        <Shade top={0} bottom={0.5} />
        <Tag text={t.tagCode} />
        <Caption text={t.bCode} y={1120} size={104} />
      </Sequence>
      <Sequence from={540} durationInFrames={70}>
        <Clip src="game-english" from={4.0} rate={2.4} zoom={[1.04, 1.08]} focus={[0.5, 0]} whip={false} />
        <Shade top={0} bottom={0.5} />
        <Tag text={t.tagLang} />
        <Caption text={t.bLang} y={1120} size={104} />
      </Sequence>
      <Sequence from={610}>
        <Flash />
        <EndCard props={props} lines={t.bEnd} badge={t.badge} />
      </Sequence>
      <Music src="plains-stage.ogg" total={LEARNING_FRAMES} volume={0.55} duck={Boolean(props.voiceover)} lines={vo} />
      <Voiceover file={props.voiceover} />
      <VoiceLines lines={vo} />
      <Sfx at={6} src="pop" />
      <Sfx at={90} src="whoosh" volume={0.5} />
      <Sfx at={156} src="correct" />
      <Sfx at={180} src="whoosh" volume={0.5} />
      <Sfx at={270} src="correct" />
      <Sfx at={278} src="slash" />
      <Sfx at={280} src="hit" volume={0.6} />
      <Sfx at={284} src="coins" />
      <Sfx at={395} src="levelup" volume={0.9} />
      <Sfx at={450} src="tap" />
      <Sfx at={540} src="tap" />
      <Sfx at={610} src="finale" volume={0.9} />
    </AbsoluteFill>
  )
}

/** VIDEO C — the RPG experience, 25 s. Music: Town Theme RPG. */
export const RPG_FRAMES = 750
export function RpgVideo(props: CampaignProps) {
  const t = COPY[props.lang]
  const vo = props.lang === 'ms' ? (VO.C as VoiceLine[]) : []
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <Sequence durationInFrames={90}>
        <Clip src="lab-showcase" from={1} rate={0.8} zoom={[1.05, 1.15]} whip={false} />
        <Shade top={0.6} bottom={0.2} />
        <Sparkles count={30} seed="rpg" />
        <Caption plate text={t.cHook} y={420} size={104} delay={4} stagger={5} />
      </Sequence>
      <Sequence from={90} durationInFrames={80}>
        <Clip src="game-creator" from={0} rate={1.4} zoom={[1.3, 1.38]} focus={[0.5, 0.2]} />
        <Shade top={0.2} bottom={0.6} />
        <Tag text={t.tagReal} at="top" />
        <Caption text={t.cHero} y={1330} size={104} />
      </Sequence>
      <Sequence from={170} durationInFrames={70}>
        <Clip src="game-harvest" from={0.3} zoom={[1.15, 1.3]} focus={[0.5, 0.45]} />
        <Shade top={0.55} bottom={0} />
        <Caption text={t.harvest} y={380} size={96} />
      </Sequence>
      <Sequence from={240} durationInFrames={90}>
        <Clip src="lab-showcase" from={3} zoom={[1.02, 1.12]} />
        <Shade top={0.55} bottom={0} />
        <Tag text={t.tagBuild} />
        <Caption text={t.buildIsland} y={380} size={104} />
      </Sequence>
      <Sequence from={330} durationInFrames={70}>
        <Clip src="game-pet" from={1.4} zoom={[1.2, 1.3]} focus={[0.5, 0.28]} />
        <Shade top={0.2} bottom={0.6} />
        <Caption text={t.cPet} y={1330} size={110} />
      </Sequence>
      <Sequence from={400} durationInFrames={70}>
        <Clip src="game-shop" from={0.3} zoom={[1.02, 1.08]} />
        <Shade top={0.55} bottom={0} />
        <Caption text={t.cGear} y={380} size={120} />
      </Sequence>
      {(['lab-science', 'lab-maths', 'lab-tech', 'lab-language'] as const).map((src, i) => (
        <Sequence key={src} from={470 + i * 22} durationInFrames={22}>
          <Clip src={src} from={2} zoom={[1.05, 1.1]} whip={false} />
        </Sequence>
      ))}
      <Sequence from={470} durationInFrames={88}>
        <Shade top={0.55} bottom={0} />
        <Caption text={t.cIslands} y={380} size={104} />
      </Sequence>
      <Sequence from={558} durationInFrames={62}>
        <Clip src="lab-camp" from={1} zoom={[1.02, 1.1]} />
        <Shade top={0.55} bottom={0} />
        <Caption text={t.camps} y={380} size={98} />
      </Sequence>
      <Sequence from={620}>
        <Flash />
        <EndCard props={props} lines={t.cEnd} badge={t.badge} />
      </Sequence>
      <Music src="town-theme.mp3" total={RPG_FRAMES} volume={0.6} duck={Boolean(props.voiceover)} lines={vo} />
      <Voiceover file={props.voiceover} />
      <VoiceLines lines={vo} />
      <Sfx at={4} src="sparkle" />
      <Sfx at={90} src="whoosh" volume={0.5} />
      <Sfx at={176} src="slash" />
      <Sfx at={195} src="slash" />
      <Sfx at={215} src="slash" />
      <Sfx at={233} src="pop" />
      <Sfx at={240} src="plop" />
      <Sfx at={378} src="sparkle" />
      <Sfx at={400} src="coins" />
      <Sfx at={470} src="whoosh" volume={0.5} />
      <Sfx at={558} src="bell" volume={0.5} />
      <Sfx at={620} src="finale" volume={0.9} />
    </AbsoluteFill>
  )
}

/** VIDEO D — help us build EDUVENTURE, 20 s. Music: Apple Cider. */
export const COMMUNITY_FRAMES = 600
function Ask({ text, from }: { text: string; from: number }) {
  return (
    <Sequence from={from} durationInFrames={60}>
      <Caption text={text} y={760} size={92} stagger={4} outAt={6} />
    </Sequence>
  )
}
export function CommunityVideo(props: CampaignProps) {
  const t = COPY[props.lang]
  const vo = props.lang === 'ms' ? (VO.D as VoiceLine[]) : []
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <Sequence durationInFrames={100}>
        <Clip src="lab-dropin" from={0} rate={0.9} zoom={[1, 1.08]} whip={false} />
        <Shade top={0.6} bottom={0.3} />
        <Caption plate text={t.dHook} y={460} size={104} delay={4} stagger={5} />
      </Sequence>
      <Sequence from={100} durationInFrames={100}>
        <PhoneFrame src="phone-world" from={0.3} y={1020} />
        <Tag text={t.tagPhone} />
        <Caption text={t.dNow} y={520} size={96} stagger={4} />
      </Sequence>
      <Sequence from={200} durationInFrames={90}>
        <Clip src="lab-kampung" from={1} zoom={[1.02, 1.1]} />
        <Shade top={0.6} bottom={0} />
        <Caption text={t.dNotDone} y={400} size={104} />
        <Sequence from={30}><Subline text={t.dYou} y={560} size={52} /></Sequence>
      </Sequence>
      <Sequence from={290} durationInFrames={190}>
        <KeyArt keys={[[0, 390, 290, 1.9], [190, 430, 280, 2.05]]} blur={10} />
        <AbsoluteFill style={{ backgroundColor: 'rgba(59,42,30,0.45)' }} />
        <Sparkles count={30} seed="ask" />
        <Ask text={t.dAsk1} from={0} />
        <Ask text={t.dAsk2} from={62} />
        <Ask text={t.dAsk3} from={124} />
        <Sequence from={20}><Subline text={t.dComment} y={1180} size={58} color={C.gold} /></Sequence>
      </Sequence>
      <Sequence from={480}>
        <Flash />
        <EndCard props={props} lines={t.dEnd} badge={t.badge} />
      </Sequence>
      <Music src="apple-cider.mp3" total={COMMUNITY_FRAMES} volume={0.6} duck={Boolean(props.voiceover)} lines={vo} />
      <Voiceover file={props.voiceover} />
      <VoiceLines lines={vo} />
      <Sfx at={4} src="pop" />
      <Sfx at={100} src="whoosh" volume={0.5} />
      <Sfx at={200} src="whoosh" volume={0.5} />
      <Sfx at={290} src="bell" volume={0.5} />
      <Sfx at={352} src="pop" />
      <Sfx at={414} src="pop" />
      <Sfx at={480} src="finale" volume={0.9} />
    </AbsoluteFill>
  )
}

