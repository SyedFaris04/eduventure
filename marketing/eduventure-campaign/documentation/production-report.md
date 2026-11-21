# EDUVENTURE promotional campaign: production report

Produced 2026-11-21 on the owner's laptop, with free tools only. No paid assets, no AI-generated images or video, no
stock footage.

## 1. Environment and capabilities
| Item | Found |
|---|---|
| OS | Windows 11 Home Single Language (10.0.26300) |
| CPU | Intel Core i5-12450H, 8 cores / 12 threads |
| RAM | 15.7 GB (about 3 GB free while working, so renders run 3 frames at a time) |
| GPU | NVIDIA GeForce RTX 4050 Laptop + Intel UHD; Chrome renders WebGL on the GPU through ANGLE D3D11 |
| Disk | About 54 GB free on C: |
| Screen | 1920 × 1080 |
| Node.js / npm | 22.15.1 |
| Python | 3.12.9 (with Pillow) |
| Git | 2.52.0 |
| FFmpeg / FFprobe | Not on PATH; used the copies bundled with Remotion |
| Chrome / Edge | Installed |
| Playwright | Installed in the project (@playwright/test) |
| Remotion | Not installed before; added locally to this folder only (4.0.545) |
| Video apps | OBS Studio, Blender, Adobe Acrobat. No After Effects, Premiere, DaVinci Resolve or CapCut |
| Text-to-speech | Windows SAPI voices (David, Zira, Huihui): robotic, so not used for narration |

**Workflow chosen:**
- **Playwright** drives the real game and records it. The page is streamed from Chrome's screencast into FFmpeg.
  Chrome runs off-screen on the GPU at a forced 2× pixel ratio, so frames come out a true 1080 × 1920.
- **Remotion** (React, the same stack as the game) composes the videos: real footage, motion graphics drawn in code,
  CC0 music and sound effects.
- **FFmpeg and FFprobe** encode the videos and check them.

OBS could record the screen too, but it can't be scripted to replay the same game session exactly. Remotion keeps
every video editable and re-renderable.

Nothing was installed globally and no system settings were changed. Remotion lives in this folder's own
`node_modules`, and it downloads its headless Chrome into that folder.

## 2. The game as it is today (what the videos may show)
| Feature | Status | How it appears |
|---|---|---|
| 3D world: Greenhaven Kampung + Science Island, Mathematics Mountains, Technology City, Language Kingdom | ✅ Working | Real footage |
| Battles answered with real questions (630 questions, 25 subjects, 8 question types) | ✅ Working | Real footage, tagged REAL GAMEPLAY |
| XP, gold, levels, unlocks, combos, missions | ✅ Working | Real footage (the real "Level up! You are now level 2" screen) |
| "Why not?" explanation after a wrong answer | ✅ Working | Real footage |
| Character creator ("Surprise me") | ✅ Working | Real footage |
| Knowledge pet (hatch at level 2, grows by learning) | ✅ Working | Real footage |
| Shop and equipment | ✅ Working | Real footage |
| Harvesting (slash trees, rocks, herbs, crystals) | ✅ Working | Real footage |
| My island: build and decorate, 50 items | ✅ Working | The game's real models, laid out in the dev world lab; tagged "50 THINGS TO BUILD" |
| Camp builds and whiteboard (built together by an island's players) | ✅ Working | Real game world (dev lab, camp finished) |
| Festivals (Hari Raya, Chinese New Year, Deepavali decorations) | ✅ Working (dates in the database) | Real game world (dev lab festival preview) |
| Code Academy (Python, JavaScript), Language Hall (English, Bahasa Melayu) | ✅ Working | Real footage |
| Web and Android (APK) | ✅ Live | The end card: EARLY ACCESS · FREE · WEB & ANDROID |
| Multiplayer: see other players, emotes | 🟡 Built, not online (room server not deployed) | Recorded against a local room server; tagged **MULTIPLAYER · COMING SOON**; captions say "play with friends", the narration says "soon" |
| Friends lists, chat, clans, leaderboards, tournaments | ⬜ Planned (Phase 5/6) | Not shown as working; one tag: **CLANS & LEADERBOARDS · PLANNED** |
| Clan headquarters, world boss, PvP | ⬜ Planned | Not shown |

**Wording rules used:**
- Every gameplay claim matches the table above. No player counts, ratings or testimonials.
- "Early access" and "free" are accurate: there are no purchases.
- The key art is used for the hook and the logo, never presented as gameplay.
- The key art's painted "Tip: Join a clan…" line is kept out of frame (clans aren't built).

## 3. Deliverables
See section 5 for the exact export paths and the check results.

| # | Deliverable | Where |
|---|---|---|
| 1 | Main 43 s trailer | `exports/*/eduventure-A-main-trailer.mp4` |
| 2 | Three short videos (B learning, C RPG, D community) | `exports/*/eduventure-B-learning.mp4`, `-C-rpg.mp4`, `-D-community.mp4` |
| 3 | Vertical exports per platform | `exports/tiktok`, `instagram`, `youtube-shorts`, `threads` (1080 × 1920 H.264/AAC MP4) |
| 4 | Editable source project | `source/` (Remotion), `source/recording/` (capture scripts), `assets/` |
| 5 | Voice-over scripts | `scripts/*.md` |
| 6 | Storyboards | `storyboards/main-trailer.md` (all four videos) |
| 7 | Instagram captions | `captions/instagram.md` |
| 8 | TikTok captions | `captions/tiktok.md` |
| 9 | Threads posts | `captions/threads.md` |
| 10 | Feedback campaign copy and form | `captions/feedback-campaign.md` |
| 11 | Asset credits | `documentation/asset-credits.md` |
| 12 | This report | `documentation/production-report.md` |
| 13 | How to edit and re-export | `documentation/editing-guide.md` |

## 4. Quality control (all passed, 2026-11-21)
`node source/render-all.mjs --check` runs these checks with FFprobe and FFmpeg. The full results are in
`exports/check-report.json`.

| Video | Duration | Size | Video | Audio | Loudness | True peak | Black frames |
|---|---|---|---|---|---|---|---|
| A, main trailer | 43.01 s | 26.9 MB | 1080 × 1920, 30 fps, H.264, yuv420p (bt709) | AAC 192 kb/s, 48 kHz | −17.8 LUFS | −1.8 dBTP | none |
| B, learning | 25.00 s | 9.2 MB | same | same | −17.5 LUFS | −1.5 dBTP | none |
| C, RPG | 25.00 s | 13.5 MB | same | same | −18.7 LUFS | −1.8 dBTP | none |
| D, community | 20.01 s | 11.1 MB | same | same | −19.7 LUFS | −2.6 dBTP | none |

**Also checked by looking at frames sampled every 1–1.5 s from each finished video** (contact sheets):
- the captions are spelled right and read clearly at phone size, inside the safe zone;
- no caption covers the question being asked;
- the logo is clean (cut out from the key art, with no sky box);
- the key art's painted loading bar and its "Join a clan" tip are never in frame;
- every honesty label is in place: REAL GAMEPLAY, COMING SOON, PLANNED;
- the end card shows the real website and a QR code that opens it.

**Fixed during review:**
- the hook zoom was too soft;
- the painted interface showed in the logo shot;
- captions overlapped the battle interface (now a framed screen card);
- `*gold*` phrases of several words showed their asterisks;
- the island montage was blurred by the cut transition;
- the end-card lines overlapped;
- the true peak was −0.2 dBTP (a master gain brought it to −1.5 dBTP or lower);
- the colour range was full-range (yuvj420p), now standard yuv420p bt709.

**Not checked:**
- **How it sounds:** I can't listen. The levels were measured, not heard, so watch each video once with sound on.
- **Upload previews:** not checked on a real Instagram or TikTok upload.

## 5. Exports (rendered and checked)
All four platforms take the same file: 1080 × 1920 H.264/AAC MP4.
```
C:\dev\eduventure\marketing\eduventure-campaign\exports\tiktok\eduventure-A-main-trailer.mp4
C:\dev\eduventure\marketing\eduventure-campaign\exports\tiktok\eduventure-B-learning.mp4
C:\dev\eduventure\marketing\eduventure-campaign\exports\tiktok\eduventure-C-rpg.mp4
C:\dev\eduventure\marketing\eduventure-campaign\exports\tiktok\eduventure-D-community.mp4
```
The same four files are in `exports\instagram\`, `exports\youtube-shorts\` and `exports\threads\`.

The exports and recordings are not in git (they are large). Back up `exports/` and `assets/recordings/` yourself, for
example to Google Drive.

## 6. Notes and limits
- **No voice-over is rendered.**
  - Windows' built-in voices sound robotic and would cheapen the trailer.
  - The videos are captioned so they work muted, which is how most people scroll.
  - Scripts are in `scripts/`. Recording one and setting the `voiceover` field adds it; the music ducks automatically.
- **No social handles or feedback form exist yet, so none are shown.** Fill in the fields when they exist (see the editing guide). The website and QR code are real.
- **Footage limits:**
  - The gameplay was recorded in a portrait window; on phones the game plays sideways. Video D shows the real sideways phone layout in a phone frame.
  - The multiplayer shot was recorded against a local room server, because the online one isn't deployed. It is labelled COMING SOON.
  - The "Wave" emote didn't fire in that recording, so the shot shows the second player walking up, not waving.
  - The boat ride wasn't used: in portrait the boat sits at the edge of the frame.
- **Remotion licence:** free for individuals and companies of up to 3 people. A larger company needs a paid licence.
- **The 630 questions are still "in review":** they are served in the early-access game, but per the project's standing rules a person should approve them before a full launch.

## 7. Bahasa Melayu versions (added 2026-11-21)
The owner wants to reach Malaysian players first, so each video now has a Bahasa Melayu version: Malay on-screen
text (`source/copy.ts`, using the game's own Malay terms) and a male Malay voice-over (Microsoft Azure,
ms-MY-OsmanNeural), timed line by line to the cuts, with the music ducking under the voice. The English versions are
unchanged.

**Wording notes:**
- The game calls the Language Hall "Dewan Bahasa", which is close to the name of the government agency Dewan Bahasa dan Pustaka. The videos say "Pelajaran Bahasa" instead. The owner may want to rename it in the game too.
- The Malay captions and the voice script need a native speaker's read before posting (the project's standing rule for Malay text).
