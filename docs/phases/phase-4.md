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
