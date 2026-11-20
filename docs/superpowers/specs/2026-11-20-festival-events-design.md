# Festival and school-holiday events — design

Date: 2026-11-20. Status: approved approach (decor + missions + stall), awaiting design approval.

## Intent

The owner asked for festival and school-holiday events, without Christmas: the year-end school holiday, Chinese New Year, Ramadan and Hari Raya, Merdeka and Deepavali. The game is Malaysian-first. During these times the Kampung should feel festive, and players should have a reason to come back and keep learning: festival missions earn festival tokens, and tokens buy themed outfits and pet items at a festival stall. It celebrates every community's festival, and every player can join every event.

## Goals

- During a festival, the Kampung (Greenhaven) shows that festival's 3D decorations.
- Festival missions (one daily and four that last the whole festival) pay **festival tokens** as well as some XP and gold.
- A **festival stall** sells that festival's items for tokens: one hero item and one pet item per festival, 10 items in all.
- Festival dates live in the database in Malaysia time. The owner can correct them, because Raya and Deepavali dates are only confirmed late.
- Admins can **preview** any festival before it starts. They see its missions, stall and decorations as if it were on. The live tests use this too.

## Non-goals

- Christmas. The owner dropped it.
- Festival quizzes or culture questions. The owner chose the smaller option.
- A festival boss or any shared-world fight. That belongs to the multiplayer project.
- Festival decorations on the other islands. The Kampung only.
- An admin screen for editing dates. The owner edits the `festivals` table in the Supabase table editor.
- Notifications, a paid currency, loot boxes or random rewards.

## Anti-goals (a failure even if it works)

- **Pressure on children to keep playing.** No ticking countdowns, no "last chance" wording, no items that are gone forever. Festival items come back every year at the same price, and tokens never expire, so missing a festival costs nothing.
- **Unfairness to players who don't take part.** Tokens buy cosmetics only and never affect power.
- **Breaking the Malaysian content rules** in `docs/ROADMAP.md`: no religious sites or symbols, no flags or emblems as decoration, no real brands. Merdeka uses bunting in red, white, blue and yellow, never the flag. There is no crescent and star, no deities and no religious buildings.
- **Ignoring parental limits.** Festival play counts toward the daily time limit, as all play does.

## Constraints

- All rewards and purchases happen in Postgres functions marked `security definer set search_path = ''`. The client only asks.
- Each database change is a new migration. Functions are copied from their latest version and never edited once live.
- The test database is production. Live tests use anonymous players for the refusal paths. Happy paths use the admin preview on the test admin account (`TEST_ADMIN_EMAIL` in `.env.test.local`, never committed).
- All interface text goes in all 7 locales (en, ms, es, ar, zh, fr, ja).
- 3D decorations follow the quality levels: fewer pieces on low, and no fireworks movement under reduced motion.

## Approaches considered

1. **Festival dates in the database, with server-paid tokens (chosen).** A `festivals` table holds the dates. Festival missions extend the existing mission system. Tokens sit in the wallet, and a stall function spends them. The client reads which festivals are on and decorates the Kampung.
   - Every reward is checked on the server, and it reuses missions, the wallet, the shop and owned items.
2. **Gold instead of tokens.** No new currency, but festival items could be bought with gold earned outside the festival, so the festival loses its "earn it during the festival" feel. Rejected.
3. **Festival dates only in the app code.** Simpler, but the server could not check that a festival is on before paying, which breaks the standing rule that rewards are decided on the server. Rejected.

The owner described the outcome and left the how to me. Approach 1 is my call.

## Design

### Festivals and dates

A `festivals` table has these columns:
- `id` (text, for example `cny_2027`);
- `kind`: one of `school_holiday`, `cny`, `raya`, `merdeka`, `deepavali`;
- `starts_on` and `ends_on` (dates, inclusive, in `Asia/Kuala_Lumpur`).

Signed-in players can read it; nobody can write it from the client.

A festival is **on** for a player when today's Malaysia date falls between its dates. It is also on when the player is an admin who chose to preview it. Two festivals can be on at once: Chinese New Year and Ramadan overlap in February 2027. Everything below handles several festivals at once.

Seeded dates (approximate; the owner confirms the ones marked ⚠):

| id | kind | starts_on | ends_on | Basis |
|---|---|---|---|---|
| `year_end_2026` | school_holiday | 2026-12-05 | 2027-01-03 | KPM 2026 calendar: holiday 5–31 Dec; schools reopen 4 Jan 2027 |
| `cny_2027` | cny | 2027-01-30 | 2027-02-20 | CNY is 6 Feb 2027; the window runs to Chap Goh Mei |
| `raya_2027` | raya | 2027-02-09 ⚠ | 2027-03-17 | Ramadan starts about 9 Feb; Aidilfitri is 10–11 Mar 2027 (provisional); a week of Syawal after |
| `merdeka_2027` | merdeka | 2027-08-24 | 2027-09-16 | From a week before Merdeka (31 Aug) through Hari Malaysia (16 Sep) |
| `deepavali_2027` | deepavali | 2027-10-20 ⚠ | 2027-11-03 | Deepavali is 27 or 28 Oct 2027; sources disagree |
| `year_end_2027` | school_holiday | 2027-12-04 ⚠ | 2028-01-02 | KPM 2027 calendar not yet confirmed |

Ramadan and Raya are **one festival** (`raya`), from the start of Ramadan to a week after Aidilfitri. Gameplay is the same during Ramadan, with no food-or-fasting wording. It shows lights, pelita and ketupat.

### Tokens

Tokens are stored in a `festival_tokens int not null default 0` column on `player_wallets`.
- The client already reads the wallet and cannot write it.
- One currency is shared by every festival, and tokens never expire.

### Festival missions

This extends `mission_templates`:
- `festival_kind text null` sets which festival the template belongs to; null means a normal mission.
- `token_reward int not null default 0`.
- `period` now also allows `'festival'`, meaning the mission lasts the whole festival.

Behaviour:
- `ensure_missions` creates festival templates only while a festival of that kind is on for the player.
  - A `'festival'` mission's `period_start` is the festival's `starts_on`.
  - A daily festival mission uses the player's local today, as daily missions already do.
- `current_missions` includes festival missions only while their festival is on. Missions from an ended festival disappear, and an unclaimed reward is lost. This is the existing daily-mission rule, and the panel shows a festival mission's end date so it is visible.
- `my_missions` adds `festival` (the kind, or null) and `tokens` to each row.
- `claim_mission` also adds `token_reward` to `festival_tokens` and returns `tokens` in the totals.
- Two new mission kinds:
  - `harvest`, bumped by `answer_harvest` on every successful harvest, right or wrong;
  - `lesson`, bumped by `complete_lesson` every time a lesson is completed, replays included. Builder's call: counting only first completions would lock out players who have finished every lesson, and a replay still needs every question answered right.

Each of the 5 kinds gets the same 5 templates, 25 rows in all. Ids look like `f_<kind>_<shape>`.

| Shape | Period | Kind | Target | Tokens | XP | Gold |
|---|---|---|---|---|---|---|
| `daily` | daily | answer_correct | 5 | 2 | 10 | 5 |
| `answers` | festival | answer_correct | 40 | 10 | 60 | 30 |
| `monsters` | festival | defeat_monsters | 10 | 8 | 50 | 25 |
| `harvest` | festival | harvest | 10 | 8 | 40 | 20 |
| `lessons` | festival | lesson | 3 | 8 | 50 | 25 |

All four festival-long missions together pay 34 tokens. The daily one pays 2 a day, so a player who plays about 8 days and finishes the rest earns about 50, enough for both items (30 + 20).

Mission titles are shared across festivals, with the festival's name as a parameter. For example `missions.festival.answer_correct`: "{{festival}}: answer {{target}} questions right".

### Festival stall

`shop_items` gains:
- `festival_kind text null`;
- `token_price int null`, checked as present exactly when `festival_kind` is set.

Festival items keep a placeholder gold `price` of 1, like crafted items, and `buy_item` refuses them with "This item is sold at the festival stall".

`buy_festival_item(p_item)` checks, in order:
1. the player is signed in;
2. the item exists and is a festival item;
3. its festival is on for the player ("This festival is not on right now");
4. the player doesn't already own it;
5. the player has enough tokens ("Not enough festival tokens").

The wallet row is locked first, as `buy_item` does. The function then spends the tokens, inserts into `player_items` and writes `audit_logs`. It returns `{ item_id, tokens }`. There is no level gate: the items are cosmetic and common.

Items:

| Festival | Hero item (slot, tokens) | Pet item (slot, tokens) |
|---|---|---|
| school_holiday | `holiday_sunhat` (accessory, 30): a wide straw sun hat | `pet_shades` (pet_hat, 20): sunglasses |
| cny | `lion_dance_hat` (accessory, 30): a small lion-dance head cap | `pet_lantern` (pet_neck, 20): a red lantern charm |
| raya | `songket_top` (top, 30): a songket-pattern baju top | `pet_ketupat` (pet_neck, 20): a woven ketupat charm |
| merdeka | `sparkler_wand` (weapon, 30): a sparkler with a star tip | `pet_bunting` (pet_neck, 20): a bunting collar in red, white, blue and yellow |
| deepavali | `kolam_shawl` (top, 30): a shawl with a kolam pattern | `pet_marigold` (pet_neck, 20): a marigold garland |

Each item appears in:
- `CATALOGUE` with `festival: '<kind>'` and `tokens: n`, and is filtered out of the gold shop lists the same way crafted items are;
- the `shop_items` seed;
- the 3D models (`src/world3d/hero/parts.ts` and `src/world3d/pet/buildPet.ts`);
- `character.opt.<id>` in all 7 locales.

Once owned, an item can be worn like any other owned item.

### Admin preview

- `user_settings` gains `festival_preview text null references festivals(id)`.
- `set_festival_preview(p_id text, p_reset boolean default false)` takes a festival id or null.
  - It requires `has_role(array['admin'])` and refuses everyone else with "Admins only".
  - With `p_reset`, it also wipes the calling admin's progress for that festival kind, so previews and live tests can be repeated on a production database:
    - deletes their `player_missions` for that kind's festival templates;
    - removes their `player_items` for that kind's festival items;
    - sets their `festival_tokens` to 50.
  - This only ever touches the caller's own account. It is documented in `/admin` as "Reset my preview progress". Builder's call: the test database is production, and the happy path must be repeatable.
  - Non-admin players can't write the column directly; the existing user_settings policies must be checked and tightened if needed.
- One internal function, `active_festivals(p_user uuid)`, returns the festivals that are on (real by Malaysia date, plus the admin's preview). Missions and the stall use only this function. It is revoked from client roles.
- A client RPC, `my_festivals()`, returns the festivals on for the caller: `id`, `kind`, `starts_on`, `ends_on`, `preview` (boolean), plus `tokens`.
- The `/admin` page gets a small "Festival preview" select: none or any festival id.

### Client

- **`useFestivals()` hook** (TanStack Query on `my_festivals`, refetched every 10 minutes). It returns the festivals that are on and the token count.
- **World HUD:** a festival chip in the top-left stack under the materials bar, showing the festival name, its end date ("until 3 Jan") and the token count. It links to the stall. Its text is calm, with no countdown.
- **Home missions panel:** a "Festival" section appears when festival missions exist. Each row shows its token reward next to XP and gold, and the festival-long missions show "until <date>".
- **Shop page:** a "Festival stall" section at the top while a festival is on. It lists each festival's items with their token price, Buy and Owned states, and the player's tokens.
- **Kampung decorations** (`src/world3d/FestivalDecor.tsx`), drawn when the place is greenhaven and that festival is on. None of the pieces block movement.
  - school_holiday: extra wau kites and beach umbrellas by the jetty.
  - cny: red lanterns on strings near the houses, and potted mandarin-orange trees.
  - raya: pelita (bamboo oil torches) along the paths, and hanging ketupat.
  - merdeka: bunting strings in red, white, blue and yellow, and fireworks at night or on a loop. The fireworks don't move under reduced motion.
  - deepavali: kolam patterns as ground decals near the square, and string lights.
  - Several festivals can be on at once: draw each one's decorations.

## Testing

- **Unit (Vitest):**
  - festival helpers (date label, which items belong to which festival);
  - the HUD chip, the missions festival section, the stall section (states: buy, owned, not enough tokens);
  - catalogue and shop filters.
- **Live (Vitest RLS):**
  - anonymous player:
    - no festival on now (until 5 Dec 2026) or if one is on, the test adjusts;
    - `buy_festival_item` refuses when the festival is off;
    - `buy_item` refuses festival items;
    - tokens and preview cannot be written directly;
    - `set_festival_preview` refuses non-admins;
  - admin preview, started with `p_reset = true` (tokens 50):
    - festival missions appear;
    - after 5 right answers the daily festival mission is complete, and claiming pays 2 tokens;
    - buying the pet item spends 20 tokens, and a second buy is refused;
    - finally clear the preview;
  - `shop.test.ts`: `festival_kind` and `token_price` match the catalogue.
- **End-to-end (Playwright):** an admin previews a festival. The Kampung shows the chip, and the stall lists the items. This is optional if the admin login in end-to-end tests is fragile; the live tests cover the server.

## Left to the builder

- Which date decides when a festival is on: Malaysia date (decided above). Daily festival missions still use the player's local day.
- How to stop non-admins writing `user_settings.festival_preview` directly: column grants or a trigger.
- Showing a festival once when a previewed festival is also really on.

- Exact decoration positions in the Kampung and the model geometry.
- The token icon (a lucide icon such as `Star` or `Sparkles`), the translated text, and translations of the festival names. "Hari Raya", "Deepavali" and "Merdeka" stay as they are in every locale.
- Whether the HUD chip links to `/shop#festival` or opens the shop page scrolled to the stall.
