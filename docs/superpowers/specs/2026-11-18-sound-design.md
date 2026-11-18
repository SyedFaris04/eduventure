# Sound effects and calm background music — design (small project)

Date: 18 Nov 2026. Owner: "add sound effects … and background sound that is calm and happy for the user to feel calm
during their study."

**Today.** `src/features/loading/sound.ts` plays three synthesized chimes (battles, loading, Home); sound is off by default
(browsers allow audio only after a tap) and there is no music.

**Goals.**
- **Music composed in code** (Web Audio): a soft pad, a gentle plucked melody and a quiet bass on a pentatonic scale
  (so nothing ever clashes), around 72 bpm. One mood per place — kampung (Greenhaven), rainforest (Science Island),
  alpine (Mathematics Mountains), tech (Technology City), kingdom (Language Kingdom) — and a calm "study" mood for Home,
  lessons and other pages. Moods crossfade over two seconds. During battles and lessons the music drops to half
  volume so questions stay the focus (the research warns about "seductive details").
- **Sound effects composed in code:** tap, correct, wrong (soft, never harsh), victory, defeat (gentle), coin, level up,
  mission done, footstep, splash (boat), hop (monster), pet chirp, evolve sparkle, buy, lesson done.
- **Controls:** Music and Effects volume sliders in ⚙️ Settings (defaults 35% and 70%); the Home speaker button mutes or
  unmutes everything (it is the existing setting). Saved on the device. Nothing plays until the player has tapped once.
- **Swap-in slot:** a file `public/assets/audio/music-<mood>.mp3`, if present, plays instead of the composed music for
  that mood (listed in `docs/art-spec.md`).

**Non-goals.** Voice acting, per-monster sounds, spatial audio.

**Anti-goals.** Loud, startling or "failure" sounds that shame a wrong answer; music competing with lesson speech
(music ducks further while the Language Hall speaks).

**Approach.** One `AudioContext` with master/music/effects gains; a lookahead scheduler for music; effects as tiny
envelopes. Alternative: CC0 audio files — richer, but adds downloads, licence checks and sounds nobody here has
heard; kept possible through the swap-in slot.
