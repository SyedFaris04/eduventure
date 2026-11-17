# Art credits

Every downloaded art file in the game is listed here with its source and licence. `npm run fetch:models` (scripts/fetch-models.mjs) downloads and trims them. The trimmed output in `public/assets/models/` is committed.

## KayKit by Kay Lousberg ([kaylousberg.com](https://www.kaylousberg.com))

Licence: **CC0 1.0** (public domain). From each pack's `LICENSE.txt`:

> This content is free to use in personal, educational and commercial projects.
> Support me by crediting Kay Lousberg, www.kaylousberg.com (this is not mandatory)

We credit him anyway.

| File | Source (GitHub `KayKit-Game-Assets`) | Changes |
|---|---|---|
| `rig.glb` | `KayKit-Character-Pack-Adventures-1.0` · `Characters/gltf/Knight.glb` | All meshes removed. Skeleton kept. Only 8 clips kept: Idle, Walking_A, Running_A, Cheer, Hit_A, Interact, 1H_Melee_Attack_Chop, Jump_Full_Short |
| `tree_a.glb`, `tree_b.glb` | `KayKit-Medieval-Hexagon-Pack-1.0` · `decoration/nature/tree_single_A`, `_B` | Converted to GLB |
| `rock_a/b/c.glb` | same pack · `decoration/nature/rock_single_A`, `_B`, `_C` | Converted to GLB |
| `house_a.glb`, `house_b.glb` | same pack · `buildings/green/building_home_A_green`, `_B_green` | Converted to GLB |
| `well.glb` | same pack · `buildings/blue/building_well_blue` | Converted to GLB |
| `fence.glb` | same pack · `buildings/neutral/fence_wood_straight` | Converted to GLB |

## Made for EDUVENTURE

The hero's body parts, hair, clothes, weapons and shop items are built in code (`src/world3d/hero/`). So are the monsters, the bosses (Greenhaven Guardian, Raja Rafflesia, Abacus Titan), the ground, water, bushes, bridge, jetty, flowers and grass.

The island scenery is code-built too (`src/world3d/props/codeProps.ts`):
- palms, kampung houses, the pasar malam stall, ferns, mangroves and mushrooms;
- snowy pines, pillars, sundials and the abacus gate;
- the wau kite, the waterfall and the perahu in the boat ride;
- Technology City: server towers, neon lamps, the robot statue, holo trees and the Code Academy, plus Bugsy, Byte-bot, Loopy and the Glitch Golem;
- Language Kingdom: library towers, signposts, scroll trees, letter blocks and the Language Hall, plus Wordworm, Alpha-bat, Comma-leon and the Lexicon Dragon. Word-card pictures in the Language Hall are the device's emoji.

All of it is original to this project. No new art pack was added for the islands.
