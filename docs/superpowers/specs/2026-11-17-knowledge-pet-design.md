# Knowledge Pet — design

Date: 17 Nov 2026. Approved in conversation ("okay proceed") after the engagement research
(`docs/research/learning-game-engagement-features.md`, feature 6 and the pet section).

## Why

The owner wants a companion that makes players come back and keep learning, that **evolves based on level and gold**,
and that can be **customized with gold**. The research adds the guardrails: the pet must grow from *learning*, never
suffer, and money must never buy around learning (the Prodigy "better pets" criticism). Gold is earn-only in EDUVENTURE
(no real-money purchase exists), so a gold fee is a token, not a paywall.

## Goals

- A player picks an egg at **level 2**: kancil, beruang (sun bear) or naga. They pick a name from a preset list
  (safe for every age band; no free text).
- The pet earns **pet points** only from learning:
  - +1 per correct answer (battles and bosses), at most **30 per day** from answers (stops farming);
  - +5 the first time a lesson is completed (Code Academy or Language Hall);
  - +3 per **day played** (any answered question or completed lesson). A missed day costs nothing.
- Points also fill four **subject branches** — science, maths, technology, language — from the subject of the answer
  (via `islands.subject_ids`). Code lessons feed technology, language lessons feed language. Subjects outside the
  four islands (history, economics, …) add to the total only.
- **Evolution** is a button the player presses when every gate is met:

  | Step | Pet points | Player level | Gold fee ("Upacara Evolusi") |
  |---|---|---|---|
  | Hatch → baby | — | 2 | free |
  | Baby → young | 100 | 5 | 50 |
  | Young → adult | 300 | 10 | 150 |

  The fee is taken from the wallet in the same transaction. Points are never spent; they keep growing after adult.
- The **adult form** is chosen at the young → adult step from the branches:
  - every branch ≥ 20% of the branch total (or a zero total) → **Seimbang** (balanced), the rare form;
  - otherwise the biggest branch (ties: science, maths, technology, language) → Science / Maths / Technology / Language form.

  The pet page shows the four branch bars and says which form the pet is heading for, so the choice is visible.
  Every form is equally strong (no stats): forms differ in colours, a crest and a glow.
- **Customization with gold**: a "Pet corner" in the shop with fixed-price items in three pet slots — hat, neck, dye.
  Same rules as hero items: fixed price, no randomness, rarity tiers unlock by level (rare 5, epic 10), owned once.
  The player dresses the pet on the pet page.
- The pet **follows the hero** in the 3D world on every island, sized by stage.
- The pet **never suffers**: no hunger, sickness, sadness, running away, lost points or de-evolution. When the player
  answers wrongly in a battle, the pet cheers them on ("We'll get it next time!").
- A **pet page** (`/pet`), reached from the world HUD and the Home screen: hatch picker, the pet picture, name, stage,
  points to the next step, branch bars, the evolve checklist (points ✓ level ✓ gold ✓) and the dress-up slots.

## Non-goals (this round)

Pet adventures and souvenirs, "teach your pet", photo mode and share cards, pet house/habitat, renaming, festival
outfits, notifications of any kind, pet help in battle (hints), more species. All are on the research roadmap
(features 14 and 20).

## Anti-goals (would make this a failure even if it works)

- Gold, or anything bought, can skip a learning gate.
- The pet guilt-trips, decays or loses anything when the player is away.
- Free-text pet names (an under-13 safety hole).
- The client writes pet points, stage, form or look directly.

## Constraints

- Every rule lives on the server (standing rule): points, gates, fee and form are decided in Postgres functions; the
  pet row is readable by its owner only and never writable by the client.
- The level gates live in `level_unlocks` (new kind `pet`: `egg` 2, `young` 5, `adult` 10), mirrored in
  `src/game/unlocks.ts`, so level-up messages announce them like every other unlock.
- Pet shop items live in `shop_items`/`CATALOGUE` and are bought with the existing `buy_item()`.
- 3D models are built in code from primitives, like the monsters (no new assets), and stay light for phones.
- All seven UI languages get the new strings (English and Malay written properly; others drafted, as before).

## Approach

Considered:

1. **Pet as its own table with server functions, hooked into the existing answer and lesson functions** (chosen).
   One row per player; `after_answer()` and `complete_lesson()` call one internal `pet_award()`; `hatch_pet()`,
   `evolve_pet()` and `dress_pet()` are the only writers. Reuses the shop, wallet locking, unlock list and audit log.
2. Derive pet points on the fly from `question_attempts` and `lesson_rewards`. No new writes on answer, but the daily
   cap, "only after hatching" and per-branch sums become heavy queries on every read, and day-played points need
   `learning_days` joins. Rejected: slower and harder to reason about.
3. Pet items as a separate catalogue and purchase function. Rejected: duplicates `buy_item()` and the tier rules.

The pure decision rules are separate SQL functions so the live tests can check them directly without reaching level 10:
`pet_form(branches jsonb) → text` and `pet_next(stage, points, level, gold) → jsonb` (what the next step needs and
what is missing). `src/features/pet/petRules.ts` mirrors both for the UI, with the same test cases on both sides.

## Data

`player_pets` (one row per player, select-own RLS, no client writes):
`user_id` pk, `species` (kancil | beruang | naga), `name` (preset key), `stage` (baby | young | adult),
`form` (null until adult; science | maths | technology | language | seimbang), `points` int, `branches` jsonb
(`{science, maths, technology, language}` ints), `answer_day` date + `answer_points` int (the daily cap),
`look` jsonb (`{hat, neck, dye}` item ids), `hatched_at`, `evolved_at`.

Changes to existing objects: `level_unlocks.kind` gains `pet`; `shop_items.slot` gains `pet_hat`, `pet_neck`, `pet_dye`;
`after_answer()` awards answer and day points; `complete_lesson()` records the day as played (`learning_days`, which
the streak also reads — a lesson day now counts for the streak too) and awards lesson and day points.

## Starting catalogue (builder may tune names and prices)

| id | slot | rarity | price |
|---|---|---|---|
| pet_songkok | pet_hat | common | 60 |
| pet_flower | pet_hat | common | 60 |
| pet_tengkolok | pet_hat | rare | 300 |
| pet_batik | pet_neck | common | 80 |
| pet_bell | pet_neck | common | 50 |
| pet_dye_ocean | pet_dye | common | 100 |
| pet_dye_rose | pet_dye | common | 100 |
| pet_dye_gold | pet_dye | epic | 900 |

Preset names (keys, translated for display): Comel, Bulat, Si Pintar, Tompok, Bintang, Kiki, Mochi, Ombak.

## Left to the builder

Exact part lists and colours for each species × stage × form; follow distance and smoothing; the cheer line wording;
page layout within the existing UI kit; how the HUD shows the pet (a small paw button is enough).
