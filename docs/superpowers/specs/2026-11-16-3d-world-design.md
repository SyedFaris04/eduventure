# 3D World and Animation: Design

Status: waiting for owner approval. This is project 1 of 4 in the "3D islands" request. The other three are: the island world (subject islands), the Coding island, and the Languages island. Each one gets its own design.

## Intent

The owner wants EDUVENTURE to look and move like Clash of Clans or Clash Royale: real 3D, chunky chibi shapes, and animation you can read at a glance. The plan is to promote the game on social media, collect player feedback, and then publish on the Play Store and the App Store. The first seconds of a short video clip decide whether people engage, so the world has to look good and move smoothly on a phone.

## Goals

- Greenhaven Village rendered in real 3D, seen from a fixed camera angle of about 45° (like Clash). The camera follows the hero smoothly, with a little zoom and no free rotation.
- Every visible thing is a 3D model: hero, NPCs, monsters, the boss, trees, houses, fences, rocks, the well, water and the bridge.
- Smooth animation:
  - **Hero:** idle, walk and run that blend into each other, plus cheer on victory and a hit reaction on a wrong answer.
  - **Monsters:** idle bounce, hop between tiles, hit squash, and a defeat poof. They respawn with a pop.
  - **NPCs and boss:** idle breathing and a wave when the player is in range.
  - **World:** moving water with shoreline foam and sparkles, trees and grass swaying in wind, coin and XP pickups that fly to the HUD, and a ring on the ground at the tap target.
- One hero renderer is used everywhere: the character creator, Home, the Shop previews and the world. The rule "they can never disagree" from Phase 1 stays.
- All 11 shop items exist as 3D parts.
- Runs on a mid-range Android phone. Target 30 fps or more there and 60 fps on desktop. There is a lower quality setting (no shadows, lower resolution).
- Reduced motion is respected: no camera easing, no idle bob or sway, and animations jump straight to their end pose.

## Non-goals (this project)

- More maps or subject islands (project 2), coding (project 3), languages (project 4).
- Multiplayer, pets, personal island.
- Native app builds. Capacitor stays planned for Phase 7, which now covers iOS as well as Android.
- Changes to battles, questions, rewards or any server rule.

## Anti-goals (failure even if it technically works)

- A world that stutters or drains the battery on a normal phone.
- A mixed look: assets from different art families side by side.
- The 3D hero looking different in the creator and in the world.
- Any change that lets the browser grant XP, gold or items.
- A bigger first download for people who never enter the world. The 3D world must stay a separate on-demand chunk.

## Constraints

- The stack already in the repo: three 0.187, @react-three/fiber 9, @react-three/drei 10, React 19, Zustand, Vite.
- Movement, collision and pathing stay in `src/game/movement.ts`, `map.ts` and `iso.ts`, and their tests keep passing unchanged.
- The React-side contract stays the same. The `useGame` store in `src/game/store.ts` keeps `stick`, `prompt`, `interactSeq`, `dialogue`, `battle`, `boss`, `player`, `monsters` and `defeated`, so the HUD, Minimap, TouchControls, DialogueBox and battle panels don't change.
- Art licences:
  - Only CC0 assets, or assets we make ourselves.
  - Each pack's licence is checked on its creator's page before download and recorded in `docs/art-credits.md`.
  - Primary family: KayKit by Kay Lousberg (CC0, rigged, ~75 shared animations).
- Model files are compressed GLB under `public/assets/models/`, with the whole Greenhaven set at 6 MB or less.

## Approaches considered

| Option | Trade-off | Verdict |
|---|---|---|
| **A. React Three Fiber scene** | Already installed and used on the landing page. Comes with model loading, animation blending, resize and suspense. React re-renders must be kept out of the frame loop (refs and `useFrame`, not state). | **Chosen** |
| B. Plain three.js in one class, like today's Phaser scene | Same look, more hand-written loading, resize and cleanup code. No gain. | Dropped |
| C. Babylon.js | A second 3D engine next to the three.js already shipped. Bigger download. | Dropped |
| D. 3D models pre-drawn into sprites inside Phaser | Lightest, but not real 3D, which is what the owner asked for. | Dropped |

**Art source:** free CC0 packs from one family (KayKit), plus parts we build to match. This was my call; the owner delegated it. Free AI 3D generators were rejected as the main source because:
- Meshy's free tier requires credit, and Tripo's free tier appears to be non-commercial.
- Their models come out without skeletons, so they can't walk or fight.
- Each model looks a little different, which breaks a single style.

## Design

### Scene

- `src/world3d/` replaces `src/game/scenes/` and `src/game/art/`.
- `GameCanvas` lazy-loads a `<World3D>` component, still one on-demand chunk.
- Grid to world: tile (x, y) maps to 3D (x, 0, y). The camera looks along the grid diagonal, so the screen-direction mapping in `screenDirToGrid` (keyboard and joystick) still holds.
- Ground: one instanced mesh per tile kind. The edges of the island drop to cliff faces above animated water.
- Props come from `map.props`. Houses keep their 2 × 2 footprint.
- Lighting: one warm sun casting soft shadows, plus a sky and hemisphere fill. Colours are flat and bright, the toy-like Clash look.
- Tapping the ground raycasts to the plane, gives a grid point and runs the existing `tapGoal`.

### Hero

- A KayKit humanoid rig carries the shared animation clips.
- Appearance options map to parts:
  - skin, top and bottom colours are material tints;
  - hair, accessory, backpack and the 11 shop items are separate meshes attached to bones;
  - weapons attach to the hand.
- `HeroModel` is one component, used in the creator, Home, the Shop and the world.
- Static places that must stay cheap (the Shop grid, Home) use snapshots: one hidden canvas renders a still image per appearance and caches it. Only the creator gets a live, rotatable preview.
- The SVG renderer retires once nothing uses it. Its option lists and `sanitizeAppearance` stay.

### Monsters, NPCs, boss

- Sproutling, Pebblewing and Dinobud are original designs. KayKit has no match for them, so they are built in code in the KayKit style: chunky, flat colours, outlined by shading.
- They are animated in code: squash and stretch, hops along an arc, a hit flash, and a defeat poof made of particles.
- NPCs and the boss use KayKit characters with their own animation clips.

### Animation system

- One `AnimationMixer` per rigged model, crossfading in 0.2 s between clips.
- Walk versus run is chosen from movement speed.
- Code-driven motion (bob, hop, sway) runs in `useFrame` with fixed easing curves.
- Water and wind are small vertex shaders on shared materials, so they cost almost nothing.

### Quality and performance

- Device pixel ratio capped at 2 (1.5 on low quality).
- One shadow-casting light. Shadows off on low quality.
- Instancing for tiles, grass and repeated props.
- The frame loop pauses while a battle panel covers the world, as it does now.
- Low quality turns on automatically when the frame time stays above 40 ms for 3 s, and the player can switch it in settings.

### Testing

- The unit tests for movement, map and walking stay as they are.
- New unit tests:
  - the appearance-to-parts mapping covers every free option and every shop item;
  - the grid-to-world projection round-trips;
  - automatic low-quality switching kicks in under sustained slow frames.
- The end-to-end tests keep driving the real canvas. A development-only hook `window.__world.screenOf({x, y})` returns where a grid point appears on screen, replacing the old iso pixel maths in `clickGrid`.
- A manual check on the owner's phone that the world runs smoothly, with fps shown in a development overlay.

### Removal

- Phaser, `BootScene`, `WorldScene` and `art/tiles.ts` / `art/monsters.ts` are deleted once the 3D world passes every check above.
- `iso.ts` keeps `screenDirToGrid` and whatever helpers its tests cover.

## Left to the builder

- Exact KayKit packs. Character, animation and nature/medieval sets are expected. Anything a pack lacks gets modelled in code to match the style.
- Exact colours, camera distance and zoom limits, tuned against `docs/reference/isometric-style.jpg` and phone screenshots.
- How the Shop and Home snapshots are cached.
