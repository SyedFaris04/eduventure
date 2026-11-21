import { Composition, continueRender, delayRender } from 'remotion'
import { campaignProps, DEFAULT_PROPS } from './components/EndCard'
import { MAIN_FRAMES, MainTrailer } from './compositions/MainTrailer'
import { COMMUNITY_FRAMES, CommunityVideo, LEARNING_FRAMES, LearningVideo, RPG_FRAMES, RpgVideo } from './compositions/ShortVideos'
import { FPS, H, W } from './styles/theme'

// Wait for the game's fonts (Fredoka, Nunito) before any frame is captured.
const fonts = delayRender('Loading fonts')
Promise.all(['700 100px Fredoka', '600 100px Fredoka', '800 40px Nunito', '700 40px Nunito'].map((f) => document.fonts.load(f)))
  .then(() => continueRender(fonts))
  .catch(() => continueRender(fonts))

const common = { fps: FPS, width: W, height: H, schema: campaignProps, defaultProps: DEFAULT_PROPS }
const BM = { ...DEFAULT_PROPS, lang: 'ms' as const }

export function Root() {
  return (
    <>
      <Composition id="A-MainTrailer" component={MainTrailer} durationInFrames={MAIN_FRAMES} {...common} />
      <Composition id="B-Learning" component={LearningVideo} durationInFrames={LEARNING_FRAMES} {...common} />
      <Composition id="C-RPG" component={RpgVideo} durationInFrames={RPG_FRAMES} {...common} />
      <Composition id="D-Community" component={CommunityVideo} durationInFrames={COMMUNITY_FRAMES} {...common} />
      {/* Bahasa Melayu: Malay captions and the generated Malay voice-over (source/voiceover). */}
      <Composition id="A-MainTrailer-BM" component={MainTrailer} durationInFrames={MAIN_FRAMES} {...common} defaultProps={BM} />
      <Composition id="B-Learning-BM" component={LearningVideo} durationInFrames={LEARNING_FRAMES} {...common} defaultProps={BM} />
      <Composition id="C-RPG-BM" component={RpgVideo} durationInFrames={RPG_FRAMES} {...common} defaultProps={BM} />
      <Composition id="D-Community-BM" component={CommunityVideo} durationInFrames={COMMUNITY_FRAMES} {...common} defaultProps={BM} />
    </>
  )
}
