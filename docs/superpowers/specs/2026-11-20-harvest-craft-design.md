# Bigger islands, harvesting and crafting — design

Date: 20 Nov 2026. Owner decisions: harvesting asks **a quick question**; players craft **outfits & pet items, tools,
and camp decorations**; islands grow to **about twice the area**. Database change approved.

## Why
More to do on every island, and a reason to explore — while keeping "always learning while playing": every harvest is
a retrieval question, so it feeds mastery, Returning monsters, Elo ratings, missions and pet points like a battle answer.

## Bigger islands
- Each of the five maps grows from 36 × 36 to 52 × 52. The current map stays as it is in the south-west; new land is
  added to the north (16 rows) and east (16 columns), so the jetty stays on the south shore. All coordinates on the old
  map move down by 16 rows (tests and areas shift with them).
- The new land holds forests of **harvestable trees**, rocky slopes with **rocks** and a few **crystal rocks**,
  **herb** meadows, new monster zones (about +50% monsters) and a **camp clearing** with a **workbench** (and spaces
  for camp builds). New areas get names (shown in the area banner).
- The ring of border trees stays scenery; only the new glyphs are harvestable.

## Harvesting
- Materials: **wood** (harvest trees), **stone** (rocks), **herbs** (herb bushes), **crystal** (crystal rocks; needs a
  stone pickaxe or better).
- Walk next to a node and press E / tap: one question from the island's subjects (the same picker as battles, near the
  usual target chance). Right → 2, wrong → 1 and the "Why not?" card. Tools add: stone tool +1, crystal tool +2
  (axe for trees, pickaxe for rocks and crystals; herbs need no tool). The answer is recorded like a battle answer
  (no XP or gold — materials are the reward).
- A node is ready again for that player 3 minutes after harvesting (server-checked); the 3D node shows a stump or
  dimmed look meanwhile. Nodes are listed in a server table generated from the map files, so only real nodes count.

## Crafting (workbench at each camp)
- **Tools:** stone axe (4 wood, 3 stone), stone pickaxe (3 wood, 4 stone), crystal axe (6 wood, 4 crystal), crystal
  pickaxe (4 stone, 6 crystal). Owning a better tool replaces the bonus of the worse one.
- **Craft-only cosmetics** (they never appear for sale): woodcutter's hat, herb crown (accessories), crystal staff
  (weapon), rattan backpack, pet leaf hat, pet crystal collar, pet forest dye — each a recipe of materials.
- **Camp builds (together):** at each island's camp, everyone contributes materials to shared projects — bench,
  lantern, flag, whiteboard stand. When a project's total is reached it is built for everyone on that island and shows
  in the world; contributions only add (no penalties), and each player sees how much they gave.

## Rules
- Server owns materials, nodes, cooldowns, tools, recipes, ownership and build progress (standing rule). Recipes and
  nodes are data in the database; the client mirrors recipe display only.
- Inventory of materials shows on the HUD backpack and the workbench.
- Seven locales; the migration is pushed under the owner's approval for this project.

## Non-goals
Trading, personal islands, building anywhere, durability of tools, multiplayer visibility (Phase 5, next), the
whiteboard itself (comes with multiplayer; this project builds its stand).

## Approaches
Harvest as a mini-battle (a question per harvest) — chosen by the owner. Rejected: free harvesting with cooldowns
(grinding without learning), and client-side node lists (cheatable).
