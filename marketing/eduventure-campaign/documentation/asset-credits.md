# Asset credits and licences

Everything in these videos is either EDUVENTURE's own material or **CC0 (public domain)**. CC0 means free for
commercial use, with no attribution required. We credit the authors anyway. No stock footage, no commercial songs, no
paid assets and no AI-generated images or video were used.

## EDUVENTURE's own material
| Asset | Source |
|---|---|
| Key art (`assets/images/key-art.png`) and the logo cut from it (`assets/logos/`) | The project's own loading-screen artwork, `public/assets/loading/eduventure-loading.png` |
| All gameplay footage (`assets/recordings/game-*.mp4`, `phone-*.mp4`) | Recorded from the real game (local dev server, live Supabase project) by `source/recording/*.capture.ts` |
| All 3D scene footage (`assets/recordings/lab-*.mp4`) | The game's own 3D world and models, filmed in its development world lab (`/dev/world`) with a scripted camera |
| Website QR code (`assets/images/website-qr.svg`) | Generated with the `qrcode` package for https://syedfaris04.github.io/eduventure/ |
| Fonts: Fredoka, Nunito | The game's own fonts (SIL Open Font License), via @fontsource |
| Motion graphics (captions, sparkles, coins, XP bar, portal rings, labels) | Drawn in code in `source/components/` |

## Music (all CC0, from OpenGameArt.org)
| File | Track | Author | Used in |
|---|---|---|---|
| `audio/music/fairy-adventure.ogg` | Fairy Adventure | MintoDog | A, main trailer |
| `audio/music/plains-stage.ogg` | Plains Stage | MintoDog | B, learning |
| `audio/music/town-theme.mp3` | Town Theme RPG | cynicmusic | C, RPG |
| `audio/music/apple-cider.mp3` | Apple Cider (loop), from *Apple Cider Juiced!* | Zane Little Music | D, community |

Sources:
- https://opengameart.org/content/fairy-adventure
- https://opengameart.org/content/plains-stage
- https://opengameart.org/content/town-theme-rpg
- https://opengameart.org/content/apple-cider-juiced

## Sound effects (all CC0)
| File | Original | Pack and author |
|---|---|---|
| `sfx/portal.ogg` | forceField_000.ogg | Sci-Fi Sounds, Kenney (https://opengameart.org/content/sci-fi-sounds) |
| `sfx/boom.ogg` | lowFrequency_explosion_000.ogg | Sci-Fi Sounds, Kenney |
| `sfx/hit.ogg` | hit_01.ogg | 100 CC0 SFX, rubberduck (https://opengameart.org/content/100-cc0-sfx) |
| `sfx/gong.ogg` | gong_01.ogg | 100 CC0 SFX, rubberduck |
| `sfx/bell.ogg` | bell_01.ogg | 100 CC0 SFX, rubberduck |
| `sfx/plop.ogg` | plop_01.ogg | 100 CC0 SFX, rubberduck |
| `sfx/slash.ogg` | knifeSlice.ogg | RPG Sound Pack, Kenney (https://opengameart.org/content/50-rpg-sound-effects) |
| `sfx/coins.ogg` | handleCoins.ogg | RPG Sound Pack, Kenney |
| `sfx/sparkle.ogg` | glass_002.ogg | Interface Sounds, Kenney (https://opengameart.org/content/interface-sounds) |
| `sfx/whoosh.ogg` | maximize_006.ogg | Interface Sounds, Kenney |
| `sfx/tap.ogg` | select_001.ogg | Interface Sounds, Kenney |
| `sfx/correct.ogg` | confirmation_001.ogg | Interface Sounds, Kenney |
| `sfx/pop.ogg` | pluck_001.ogg | Interface Sounds, Kenney |
| `sfx/levelup.ogg` | jingles_STEEL02.ogg | Music Jingles, Kenney (https://opengameart.org/content/85-short-music-jingles) |
| `sfx/finale.ogg` | jingles_STEEL07.ogg | Music Jingles, Kenney |

Each source page was checked on 2026-11-21 and listed only CC0. The Kenney packs also contain a CC0 licence file.

## Malay voice-over (Bahasa Melayu versions)
| Item | Source |
|---|---|
| Voice | Microsoft Azure AI Speech, prebuilt neural voice **ms-MY-OsmanNeural** (male, Malaysian Malay), generated with the owner's own Azure account (free tier F0) by `source/voiceover/tts.mjs` |
| Script | Written for this campaign (`scripts/bm-voiceover.md`, `source/voiceover/ms.json`) |

Azure's terms allow prebuilt neural voices in your own products and adverts. The voice is synthetic, so each Malay end
card says "Suara latar dijana AI (Microsoft Azure)". This follows Microsoft's transparency guidance for synthetic voices.

## Tools (all free)
- Remotion 4.0.545 (video composition and rendering). Remotion is free for individuals and for companies with up to 3 employees; a larger company needs a Remotion company licence (https://www.remotion.dev/license).
- Playwright and Google Chrome (gameplay capture).
- FFmpeg and FFprobe, as bundled with Remotion (encoding and checks).
