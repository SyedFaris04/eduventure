# Art spec: replacing the 3D art

Greenhaven is drawn in 3D (three.js through React Three Fiber). Two kinds of art make it up:

- **Downloaded models.** These are KayKit packs by Kay Lousberg (CC0): the animation rig, trees, rocks, houses, the well and fences. They live in `public/assets/models/*.glb`, and every source is listed in `docs/art-credits.md`.
- **Code-built shapes.** These are made from simple rounded shapes in code:
  - the hero's body parts, hair, clothes, weapons, backpacks and all shop items (`src/world3d/hero/parts.ts`);
  - the monsters and the Guardian (`src/world3d/monsters/buildMonster.ts`);
  - the ground, water, bushes, bridge, flowers and grass.

Any of it can be swapped for hand-made models without touching the game logic.

## General rules

- **Format:** glTF binary (`.glb`), Y up, 1 unit = 1 tile, feet or base on y = 0, facing +z.
- **Size:** keep the whole `public/assets/models/` folder at 6 MB or less (a test checks this). Aim for about 2,000 triangles per prop and 5,000 per character.
- **Style:**
  - chunky and toy-like, with big heads (the head is about 40% of a character's height);
  - flat bright colours or a small gradient texture (like KayKit);
  - no realistic textures;
  - match `docs/reference/isometric-style.jpg`.
- **Light:** the sun comes from the upper left of the screen. Don't bake shadows into textures.
- **Original work only.** Nothing traced or copied from other games.
- Add every new file to `docs/art-credits.md` with its source and licence.

## Props

Props are scaled at load time to fit their footprint (`FIT` in `src/world3d/Props.tsx`), so exact model sizes don't matter. To replace one, overwrite its file in `public/assets/models/`:

| File | Footprint | Notes |
|---|---|---|
| `tree_a.glb`, `tree_b.glb` | 1 tile | They sway in the wind: the higher a vertex, the more it moves |
| `rock_a/b/c.glb` | 0.8 tile | |
| `house_a.glb`, `house_b.glb` | 2 × 2 tiles | |
| `well.glb` | 1 tile | |
| `fence.glb` | 1 tile long | Its long side is turned along the row automatically |

### Code-built props

These props are built from simple shapes in code (`src/world3d/props/codeProps.ts`), stand on y = 0 and face +z:
- `palm`, `kampung_house` (2 × 2 tiles), `stall`;
- `fern`, `mangrove`, `mushroom`;
- `pine_snow`, `pillar`, `sundial`;
- `abacus_gate` (spans 3 tiles; its posts stand on the tiles either side of the path).

To replace one with a model:
1. Add its `.glb` to `public/assets/models/`.
2. Add it to `PROP_MODELS` and `FIT` in `Props.tsx`.
3. Remove it from `CODE_PROP_KINDS`.

The same instancing draws both kinds.

## Characters

The hero and the villagers share one skeleton, `rig.glb` (the KayKit humanoid rig). It holds the clips Idle, Walking_A, Running_A, Cheer, Hit_A, Interact, 1H_Melee_Attack_Chop and Jump_Full_Short.

Clothes and hair are separate parts attached to bones, so every appearance option still works. A replacement character needs:

- the same bone names;
- each option as a separate mesh named after its option id (for example `scarf_red`, `wizard_hat`);
- a few lines in `parts.ts` mapping each id to its mesh.

## Monsters

Monsters are code-built and animated in code: idle breathing, hopping, a squash when hit and a poof on defeat. A hand-made replacement only needs to be a static model per monster or boss, facing +z with its feet on y = 0. The monsters are `sproutling`, `pebblewing`, `dinobud`, `hornbill`, `tapir`, `pangolin`, `cubelet`, `hexowl` and `pisnake`. The bosses are `guardian`, `raja_rafflesia` and `abacus_titan`. The code keeps animating it.

## Loading screen

This is unchanged: `public/assets/loading/eduventure-loading.png`.

## Music (optional)
The game composes calm music in code. To use your own tracks instead, put MP3 files in `public/assets/audio/` named
`music-<mood>.mp3` and list them in `public/assets/audio/manifest.json` (for example `["music-study.mp3"]`). Moods:
`study` (Home, lessons, other pages), `kampung` (Greenhaven), `rainforest` (Science Island), `alpine` (Mathematics
Mountains), `tech` (Technology City), `kingdom` (Language Kingdom). Use calm, loopable tracks you own or that are
licensed for commercial use (for example CC0), about 1–3 minutes, normalised quieter than −16 LUFS.
