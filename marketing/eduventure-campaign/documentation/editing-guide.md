# Editing and re-exporting the videos

Everything is code and data, so every video can be re-rendered exactly. It all runs on this laptop with free tools.

## Folder map
```
marketing/eduventure-campaign/
  assets/          public files for the videos (Remotion's public folder)
    recordings/    gameplay and 3D footage (made by source/recording; not in git: re-record or keep a backup)
    audio/music, audio/sfx   CC0 music and effects (see documentation/asset-credits.md)
    images/, logos/          key art, website QR code, logo cut-out
  source/
    Root.tsx                 the four videos (compositions) and their editable fields
    compositions/            MainTrailer.tsx (A) and ShortVideos.tsx (B, C, D): the timelines
    components/              Caption, Clip, KeyArt, Sparkles, CoinBurst, XpBar, Tag, EndCard, Music, Sfx
    styles/theme.ts          EDUVENTURE colours, fonts, frame size, social safe zone
    recording/               Playwright scripts that film the real game
    render-all.mjs           renders and checks all four videos
  exports/                   finished MP4s (not in git)
  scripts/, storyboards/, captions/, documentation/
```

## Preview and edit (Remotion Studio)
```
cd marketing/eduventure-campaign
npm install          # once
npm run studio       # opens http://localhost:3000
```
Pick a video on the left and scrub the timeline. Saving a file in `source/` updates the preview straight away.

- **Change a caption:** edit its `text` in the composition, for example `"YOUR *CHARACTER.*"`. Words between `*stars*` turn gold. `y` is the vertical position in pixels. Keep it between 230 and 1480 (the social safe zone).
- **Retime a shot:** each shot is a `<Sequence from={frame} durationInFrames={n}>`. There are 30 frames per second.
- **Swap a clip:** change `src` (a file name in `assets/recordings/`, without `.mp4`) and `from` (the second inside the clip to start at). `zoom` and `focus` control the slow push-in.
- **Sound:** `<Sfx at={frame} src="coins" />` plays `assets/audio/sfx/coins.ogg`. `<Music src=… volume=…>` sets the music; it fades out by itself at the end.
- **Labels:** `<Tag text="REAL GAMEPLAY" />` (green). Use `tone="soon"` (gold) for built-but-not-live features and `tone="planned"` (blue) for unbuilt ones. Keep these labels honest.

## Social handles, feedback form, website
Every video has editable fields (Studio's right-hand panel, or `DEFAULT_PROPS` in `source/components/EndCard.tsx`):
`website`, `instagram`, `tiktok`, `threads`, `feedbackForm`, `voiceover`. Empty fields are hidden, so nothing shows
an unfinished placeholder. Once your accounts exist, fill them in (for example `instagram: '@eduventure.game'`) and re-render.

## Bahasa Melayu versions (Malay captions and voice-over)
`A-MainTrailer-BM`, `B-Learning-BM`, `C-RPG-BM` and `D-Community-BM` use the same footage with `lang: 'ms'`:
- Every on-screen word comes from `source/copy.ts` (English and Malay side by side); edit both there.
- The Malay voice-over is one clip per line, placed at the frame in `source/voiceover/ms.json`. The music dips under each line by itself.

**Generate the voice (Microsoft Azure AI Speech, male voice ms-MY-OsmanNeural):**
1. Put your key in `marketing/eduventure-campaign/.env.local` (git ignores it; never commit or share it):
   ```
   AZURE_SPEECH_KEY=your-key
   AZURE_SPEECH_REGION=southeastasia
   ```
2. `node source/voiceover/tts.mjs`. This writes `assets/audio/vo/ms/A-01.mp3` and the rest, measures each line and speeds up any line that would run into the next one (up to +20%). It reports any line that still doesn't fit: shorten its text or move its `at`.
3. `node source/render-all.mjs A-BM B-BM C-BM D-BM`

**To change a line:** edit its `text` in `ms.json` and run step 2 again. One run uses about 2,000 characters; the free tier allows 500,000 a month.

**To use a real voice instead:** record each line as `assets/audio/vo/ms/A-01.mp3` (and so on, in the order of `ms.json`), run `node source/voiceover/tts.mjs --measure` (no key needed), then render.

## Adding a voice-over
1. Record the script in `scripts/<video>.md` (a phone voice memo is fine) and save it as `assets/audio/voiceover-main.mp3`.
2. Set `voiceover: 'audio/voiceover-main.mp3'` for that video. The music ducks to 55% automatically.
3. Re-render. Check the timing against the table in the script and nudge captions if needed.

## Render
```
cd marketing/eduventure-campaign
npm run render:all            # all four videos, then the checks
node source/render-all.mjs A  # just one (A, B, C, D, or A-BM … D-BM for the Malay versions)
node source/render-all.mjs --check   # re-check the existing exports without rendering
```
Each video goes to `exports/tiktok/`. The same file is copied to `exports/instagram/`, `exports/youtube-shorts/` and
`exports/threads/`, because all four platforms take the same 1080 × 1920 H.264/AAC MP4. The script then runs FFprobe
(size, frame rate, codecs, duration) and checks audio peaks and black frames, and prints a report.

A render takes about 3–6 minutes per video on this laptop (3 frames at a time, the RAM limit). On a machine with more
memory, raise `Config.setConcurrency` in `remotion.config.ts`.

## Re-recording the game
The recordings are made by `source/recording/*.capture.ts` with Playwright and the installed Chrome, off-screen on the
graphics card. Each run signs in new guest players on the live Supabase project, like the e2e tests do.
```
# in the repo root, with the game's dev server running (npm run dev, port 5173)
npx playwright test -c marketing/eduventure-campaign/source/recording/playwright.config.ts lab        # cinematic 3D scenes
npx playwright test -c marketing/eduventure-campaign/source/recording/playwright.config.ts journey -g "part 1"
npx playwright test -c marketing/eduventure-campaign/source/recording/playwright.config.ts journey -g "part 2"
npx playwright test -c marketing/eduventure-campaign/source/recording/playwright.config.ts journey -g "part 3"
npx playwright test -c marketing/eduventure-campaign/source/recording/playwright.config.ts phone
# multiplayer needs the local room server and a second game server pointed at it:
npm run dev --prefix server/rooms
VITE_ROOMS_URL=ws://localhost:8787 npx vite --port 5176 --strictPort
npx playwright test -c marketing/eduventure-campaign/source/recording/playwright.config.ts multiplayer
```
`ONLY=lab-showcase` re-records a single lab scene. Clip timings change from run to run (different questions and
paths), so after re-recording, check each `from` in the compositions against the new clips in the Studio.

## When the game changes
- **Multiplayer goes live:** change the `MULTIPLAYER · COMING SOON` tag to `REAL GAMEPLAY`, and the narration's "soon".
- **Clans or leaderboards are built:** record them and replace the `PLANNED` tag.
- **New festival dates, new islands:** record with `lab.capture.ts` (`?place=…`, `?festival=…`) and add a shot.
