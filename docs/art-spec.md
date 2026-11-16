# Art spec — replacing the code-drawn art

Everything in Greenhaven is currently drawn in code so the game is playable now. Each piece below can be swapped for a hand-made image without touching game logic: the game looks textures up by **key**, so a PNG loaded under the same key replaces the drawing. Send the files and the code change is a few lines in `src/game/scenes/BootScene.ts`.

## General rules

- **Format:** PNG with transparency (WebP also fine). sRGB.
- **Resolution:** draw at **2×** the sizes below; the game shows them at half size so they stay sharp on phones.
- **Style:** match `docs/reference/isometric-style.jpg` and the loading art: soft dark-brown outlines (#3b2a1e), two-tone shading, pastel palette (grass #8bc34a, path #f2b872, water #7ccbe8, wood #8a5a3b, cream #fff6e3).
- **Light:** from the top-left. Shadows fall down-right.
- **Original work only.** Nothing traced or copied from other games.

## Ground tiles (isometric 2:1)

| Key | Size at 1× | Notes |
|---|---|---|
| grass (3 variants) | 64 × 32 diamond | Small tufts, no hard grid lines |
| flowers | 64 × 32 | Grass with a few pink/white/yellow flowers |
| path | 64 × 32 | Warm orange-beige with pebbles |
| sand | 64 × 32 | Pale sand, a few specks |
| water (2 shades) | 64 × 32 | Sits 6 px lower than land |
| bridge | 64 × 32 | Planks running along the bridge |
| cliff-left / cliff-right | 64 × 50 | Earth side faces under land tiles next to water or the map edge |

## Props (origin = point that sits on the tile)

| Key | Size at 1× | Origin |
|---|---|---|
| tree | 84 × 108 | bottom-centre of the trunk shadow |
| bush | 60 × 46 | bottom-centre |
| rock | 56 × 44 | bottom-centre |
| fence | 64 × 48 | runs along the map's x direction (down-right on screen) |
| well | 64 × 80 | bottom-centre |
| house | 140 × 168 | covers 2 × 2 tiles; origin at the front corner of the footprint |
| shadow | 44 × 14 | soft ellipse under characters |

## Characters

Characters are built from layers so equipment can change without redrawing the hero (`src/features/character/renderCharacterSvg.ts`). A replacement set needs **one transparent image per option per layer**, all on the same 200 × 284 canvas, front and back views:

`backpack, body, bottom, shoes, top, head, face, eyes, hair, accessory, weapon` (back view: no face or eyes).

Option ids are listed in `src/features/character/appearance.ts`. Skin and hair colours are applied in code, so body/head/hair layers should be drawn in neutral grey with a separate outline layer, or supplied per colour.

## Monsters

| Key | Size at 1× | Notes |
|---|---|---|
| monster-sproutling | 200 × 200 | leafy slime with a sprout; friendly |
| monster-pebblewing | 200 × 200 | round pebble bird |
| monster-dinobud | 200 × 200 | chubby baby dinosaur |

Facing left-down (the game mirrors it for the other direction). An optional 3–4 frame idle loop is welcome.

## Loading screen

A version of `public/assets/loading/eduventure-loading.png` **without** the painted progress bar, percentage, tip strip, sound button, and the "Play Globally / Learn Anywhere / Make Friends" badges would let the live versions sit cleanly and be translated.
