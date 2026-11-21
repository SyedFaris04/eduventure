# My island — design

Date: 2026-11-21. Status: approved by the owner ("proceed"): a private island, items cost materials with some unlocked by level, and the database push approved.

## Intent

The owner wants players to use the materials they harvest to build their own home and area: a simple island each, where they are creative. They build a house and decorate beside it, with a lot of choice. The island also gives the slash harvesting (decision #47) a purpose.

## Goals

- **Getting there.** "My island" is at the top of the boatman's list (the jetty panel), for everyone. It's a private place (`my_island`), 32 × 32 tiles:
  - water at the edge, then a ring of sand;
  - a 24 × 24 grass build area (x 4–27, y 4–27);
  - a short jetty at the south with the boatman, to sail back.

  The player's pet follows them there. It has no monsters, harvest nodes, camp or multiplayer room. The player never joins a room there; the island is private.
- **Build mode.** A 🔨 Build button on the right opens a bottom panel, designed for a sideways phone first:
  - **Category tabs:** House, Garden, Trees, Paths and fences, Lights, Furniture, Malaysian, Water.
  - **Item cards:** each shows its 3D thumbnail (the game's `Snapshot` pattern), its material cost, and a 🔒 "Level N" when it's locked.
  - **Tools:** ↻ Turn, ✋ Move, 🗑 Remove, ✓ Done.
  - While build mode is open, the hero doesn't walk on taps and battles can't start (there are no monsters anyway).
- **Placing.** With an item chosen, tapping a tile places it there, centred on its footprint, at the current turn.
  - A ghost of the item follows the pointer on a laptop, and the last tapped tile on a phone. It is tinted green where the item fits and red where it doesn't.
  - Tapping a red spot shows "Doesn't fit there"; tapping a green spot places the item. The server is the judge, and the client only predicts with the same rules.
- **Moving and removing.**
  - **Move:** tap an item to pick it up, then tap a tile to put it down. It costs nothing.
  - **Remove:** tap an item to take it away. It refunds 100% of its materials, so trying things out is free.
- **Footprints and blocking.** Every catalogue item has a footprint (w × h tiles; turning by 90° swaps them) and a `blocks` flag: houses, trees, fences, the well and the fountain block walking; flowers, paths and mats don't. Items can't overlap, and walking respects blocking items as soon as they're placed.
- **The catalogue: about 50 items, built in code** (primitive parts, like the camp props), each with a cost in wood, stone, herbs and crystal. About a third unlock by level:
  - **House:** pondok hut (2 × 2), kampung house on stilts (3 × 3, level 3), two-storey house (3 × 3, level 6), villa (4 × 3, level 10).
  - **Garden:** round bush, flowering bush (pink, yellow), hibiscus (bunga raya), orchid pot, sunflower, flower beds (red, yellow, purple), vegetable patch, grass tuft.
  - **Trees:** coconut palm, durian, rambutan, banana, frangipani, bamboo clump, pine.
  - **Paths and fences:** dirt path, stepping stones, boardwalk, wooden fence, bamboo fence, picket fence, gate.
  - **Lights:** pelita, hanging lantern, lamp post, campfire, light arch (level 8).
  - **Furniture:** bench, table set, hammock, swing, picnic mat, mailbox, pet bed.
  - **Malaysian:** wau stand, sampan, kampung gate (level 5), congkak table.
  - **Water:** pond (2 × 2), fountain (2 × 2, level 6), well, little bridge.
- **Server rules,** in `security definer` functions:
  - `island_catalog`: a readable table.
  - `island_items`: no client access.
  - `my_island()`: the player's items.
  - `place_island_item(p_item, p_x, p_y, p_rot)`: checks the item exists, the level, that the footprint lies inside the build area and doesn't overlap, at most 400 items, and enough materials. It takes the materials, all in one transaction under a per-player lock, and returns the new item and the materials left.
  - `move_island_item(p_id, p_x, p_y, p_rot)`: the same checks, ignoring the item itself.
  - `remove_island_item(p_id)`: refunds the full cost.
  - Footprint rule, shared by client and server: an item at (x, y) with turn r covers x … x + w′ − 1 and y … y + h′ − 1, where (w′, h′) = (w, h) for r = 0 or 2, and (h, w) for r = 1 or 3.
- **Translations:** every item and interface string, in 7 languages.

## Calls from the builder check (mine)

- **The daily play limit applies to building,** the same as harvesting: `place_island_item` and `move_island_item` refuse with "Time's up for today" when a parent's limit is used up. Removing still works, since it refunds and is not play. The build panel shows the message.
- **Level-locked items join the shared unlock list.** They get `level_unlocks` rows of a new kind, `island_item`, with the key being the item id. That way "Villa unlocked!" shows on the level-up screen with every other reward, and `tests/rls/unlocks.test.ts` keeps the client mirror in step. Items without a row are open from level 1.
- **One source for the catalogue:** `content/island-items.json`. `scripts/gen-island-items.mjs` writes the seed migration (catalogue rows and unlock rows); the client imports the same JSON.

## Non-goals

- Visiting other islands, house interiors, typed text on items (signs), trading, and island expansion tiers.

## Anti-goals

- **Materials lost to a mistake.** Remove refunds in full, and a failed placement charges nothing.
- **Cheating the cost or the rules from a modified client.** Every check is on the server.
- **A slow island.** Items draw in batches by kind (like `HarvestNodes`), so 400 items cost a few draw calls.
- **Breaking landscape phones.** The build panel fits 740 × 360 (`tests/e2e/landscape.spec.ts`).

## Approaches

- **A grid editor on a private place (chosen).** It reuses maps, the boat, the props pipeline and the server-checked pattern.
- **A free-form (non-grid) editor:** rejected. It's harder on touch, its collision is hard to validate on the server, and it doesn't match the tile world.
- **Fixed build plots:** rejected. They give less creativity, against the owner's "creative and based on their preferences".

## Left to the builder

The exact models and colours, the item costs (balanced against harvesting at about 2 per node every 3 minutes, so a hut costs a few minutes and the villa takes a few sessions), the thumbnail rendering, and the ghost's look.
