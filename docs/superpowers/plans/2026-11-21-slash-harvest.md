# Slash to harvest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Harvest trees, rocks, herb bushes and crystal by tapping a slash button (or pressing E or Space): three swings, then materials. There is no question.

**Design (approved by the owner in conversation, 2026-11-21; database push approved):**
- **Slashing:** near a ready node, the right-hand action button shows an axe, pickaxe or sickle. Each tap plays the hero's `attack` swing and shakes the node. The third swing calls the server.
- **Server rules:** in a new `slash_harvest(p_place, p_x, p_y)`.
  - The node must be real, ready (not regrowing) and within the daily play limit.
  - Crystal needs a pickaxe.
  - At most one completed harvest every 1.5 s per player.
  - The player gets 2 plus the tool bonus.
  - The 3-minute regrowth stays.
  - The festival `harvest` missions still count; harvests no longer count as learning answers.
- **Balance:** recipe costs go up by half (rounded up), and camp builds that aren't finished cost twice as much.
- **Kept but unused:** `start_harvest` and `answer_harvest` stay in the database for older clients and their tests. The client no longer calls them.

**Spec:** this plan's Design section (a small change; the owner approved it in conversation).

## Review Focus

- **A modified client calling `slash_harvest` in a loop:** refused by the regrowth and the 1.5 s limit. Live test.
- **Slashing a regrowing node or a made-up node:** refused. Live test.
- **The daily play limit** still stops harvesting. It's covered by the same `play_left` check as before; this plan has no test for it.
- **Battle-free mission credit:** a slash bumps the festival harvest mission, as `answer_harvest` did.
- **A slash interrupted mid-swing** (walking away after 1 or 2 hits): it pays nothing and nothing breaks.

### Task 1: The server

- [ ] **Step 1:** Write `tests/rls/slash.test.ts`, failing first. It uses a real Greenhaven tree and rock from the generated node list:
  - slashing a tree pays 2 wood;
  - slashing it again gives "Still regrowing";
  - slashing a rock within 1.5 s gives "Too fast", and after a 1.6 s wait it pays 2 stone;
  - crystal without a pickaxe gives "pickaxe";
  - a made-up node gives "Nothing to harvest".
  - Also: the `stone_axe` recipe costs `{"wood": 6, "stone": 5}`.
- [ ] **Step 2:** Write migration `<next>_slash_harvest.sql`, push it, and run `npm run test:rls -- slash` plus the advisors. Commit.

### Task 2: The client

- [ ] **Step 1:** Write the failing unit tests:
  - `slashStep(state, now)` counts hits, and finishes at 3;
  - a different node resets the count;
  - the action button for a harvest prompt is labelled "Slash", with the material's tool icon.
- [ ] **Step 2:** Implement:
  - `src/features/harvest/slash.ts` (the hit counter) and `harvestApi.slashHarvest`;
  - the interact handler in `World3D` (E or Space, or the button) plays the attack and calls the server on the third hit;
  - a floating "+2 Wood" and a chip burst;
  - the `HarvestPanel` question window is removed;
  - i18n in 7 languages.
- [ ] **Step 3:** Update `tests/e2e/harvest.spec.ts`: walk to the tree, press E three times, and see "+2 Wood". Run `npm test` and the end-to-end test. Commit.

### Task 3: Docs

- [ ] Decision #47, ROADMAP and README. Then review and merge.
