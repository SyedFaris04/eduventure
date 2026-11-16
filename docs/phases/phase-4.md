# Phase 4 — Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Gold earned by learning buys real items that show on the hero everywhere (creator preview, Home, world), then a knowledge pet, a personal island and a skill tree built on the same item system.

**Architecture:** Same rule as before: gold and ownership change only inside database functions. Items are extra values for the existing appearance slots, so the one renderer (`renderCharacterSvg`) draws them. A trigger on `characters` refuses any shop value the player does not own, because players may update their own character row directly.

**Spec:** `docs/ROADMAP.md` (Phase 4). Rules: `CLAUDE.md`.

## Owner decisions (2026-11-16)

- Build **shop and gear first**; pet, island and skill tree follow on the same item system.
- Prices: **a treat every few days**: common about 100 gold, rare about 500, epic about 2,000 (a battle pays 10–20, the daily boss 80).

## Tasks (in order)

1. **Catalogue, ownership, purchase (database).** `shop_items` (id, slot, rarity, price, sort), `player_items` (user, item, acquired_at); `buy_item(id)` locks the wallet, refuses if already owned or too poor, deducts and grants in one transaction and writes an audit row; a trigger on `characters` rejects unowned shop values. Tests: buy with too little gold is refused and the wallet is untouched; buying twice is refused; a direct character update with an unowned item is refused, with an owned one accepted; players cannot insert ownership or change prices.
2. **Gear art and catalogue in the client.** `src/features/shop/catalogue.ts` (ids, slots, rarities, prices) with a test that it matches the database; drawings for every item in `renderCharacterSvg`; `sanitizeAppearance` keeps shop values.
3. **Shop and wardrobe screens.** `/shop`: every item drawn on your own hero, rarity, price, your gold, Buy (disabled with a reason when you cannot afford it). The character creator shows owned items as extra choices marked with a bag icon. Home gets a Shop button. All 7 languages.
4. **Phase check (gear slice).** All suites, advisors, docs; merge and push. Then plan the pet, island and skill tree slices.

## Done when (gear slice)

- Buying, owning and equipping shows on the hero in the creator, on Home and in the world.
- A purchase without enough gold is refused even when sent straight to the API; equipping an unowned item through the API is refused.

## Build record: gear slice (2026-11-16)

### Rulings (decision — reason — cost if wrong)

- An item's id is the appearance value it unlocks — the renderer, creator and world need no mapping table — renaming an item later needs a data migration for characters wearing it.
- Ownership is enforced by a trigger on `characters` (`check_items_owned`) — players may update their own character row, so a UI-only check could be bypassed — none.
- The Leaf Crown costs 80 gold, exactly one daily Guardian win — gives a first goal reachable on day one, and lets the live test earn its gold honestly (no test-only gold function) — slightly cheaper than the agreed "about 100" for commons.
- 11 items: 3 common (80–150), 5 rare (500–600), 3 epic (2,000–2,200) across hats, tops, weapons, backpack and boots; bottoms have no shop items yet — enough choice for the first slice — more items are rows plus drawings.
- Buying does not auto-equip; the card switches to Wear — players choose when to change their look — one extra tap.
- Creator "Randomise" only picks free options — random should never depend on what you own — it takes off shop items until you pick them again.

### Results

- `npm test` 89/89 · `npm run test:rls` 48 passed, 3 skipped · `npm run test:e2e` 8/8 · `npm run build` OK · Supabase advisors: 0 errors (warnings of the same expected kinds as Phase 3).
- Final review: self-review (owner did not ask for subagents).

### Next slices

Knowledge pet, personal island, skill tree (each on its own branch), after the world upgrade the owner asked for on 2026-11-16 is planned (see `docs/ROADMAP.md`).
