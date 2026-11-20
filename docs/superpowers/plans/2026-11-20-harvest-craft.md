# Bigger islands, harvesting and crafting — plan

**Spec:** `docs/superpowers/specs/2026-11-20-harvest-craft-design.md`

## Global constraints
- Maps 52 × 52; old map at offset (0, +16); new glyphs: `t` harvest tree, `o` rock node, `c` crystal rock, `v` herb,
  `k` workbench, camp build spots `n` bench, `l` lantern, `a` flag, `z` whiteboard (not blocking until built).
- Yields: right 2 / wrong 1; stone tool +1, crystal tool +2 (axe: wood; pickaxe: stone and crystal; herbs no tool);
  crystal needs a pickaxe. Node cooldown 3 minutes per player. Harvest answers: no XP or gold, recorded like battles.
- Recipes exactly as the spec. Craft-only cosmetics never purchasable. Camp builds shared per island.

## Tasks
1. **Map generator and bigger maps** — `scripts/expand-maps.py` (deterministic) rewrites the five map files; `PropKind`
   gains `harvest_tree`, `harvest_rock`, `crystal`, `herb`, `workbench`, `camp_bench`, `camp_lantern`, `camp_flag`,
   `whiteboard`; `HARVEST: Record<PropKind, Material>`; e2e coordinates shift +16 rows; map tests (reachability of
   every node, workbench, zones, NPCs, jetty) pass.
2. **3D** — code-built models for the new props; harvest nodes drawn per player state (ready / regrowing); build spots
   drawn only when built.
3. **Server** — migration: `materials`, `player_materials`, `harvest_nodes` (generated from maps by
   `scripts/gen-nodes.mjs`), `harvest_cooldowns`, `harvests` (pending question per player), `recipes`,
   `player_tools`, `shop_items.craft_only`, craft-only items, `camp_projects`/`camp_contributions`; functions
   `start_harvest(place, x, y)`, `answer_harvest(answer)`, `my_materials()`, `craft(recipe)`, `contribute(place,
   project, material, amount)`, `camp_state(place)`, `my_harvest_cooldowns(place)`; `buy_item` rejects craft-only.
   Live tests.
4. **Client harvest** — prompt on nodes (E / tap "Harvest"), `HarvestPanel` (question card, yield, Why not?),
   materials on the HUD, regrowing nodes.
5. **Workbench and camp** — `CraftPanel` (tools, cosmetics, camp projects with contributions), new hero/pet cosmetic
   rendering, built camp props in the world.
6. **Docs, gates, merge** — ROADMAP, decisions #40, art-spec, unit + server + e2e, merge.
