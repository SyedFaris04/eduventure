# Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players on the same island see each other (hero, pet, name tag, battle marker) and can send emotes, in rooms of up to 12 served by a free Cloudflare Durable Objects room server. It comes with block, report, a moderator ban, a word filter for names, and visibility switches for the player and the parent. Under-13s stay hidden until a parent approves.

**Architecture:**
- **Supabase** holds identity and every safety rule: public ids, visibility, the name filter, blocks, reports and bans. It exposes `my_room_card()`, which the room server calls with the player's own token.
- **The room server** (`server/rooms/`, Cloudflare Worker + SQLite-backed Durable Object with the Hibernation API) relays moves and emotes inside a room. Its logic is a pure `Room` class tested in Vitest.
- **The client** connects only when `VITE_ROOMS_URL` is set, keeps other players in a zustand store, and draws them in `World3D`.

**Tech Stack:** Supabase Postgres (plpgsql), Cloudflare Workers + Durable Objects (`wrangler` devDependency in `server/rooms`), React 19 + R3F + drei `Html`, zustand, TanStack Query, i18next (7 locales), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-multiplayer-design.md`

## Global Constraints

**Database**
- Every rule lives in a `security definer set search_path = ''` function. Internal helpers are revoked from `public, anon, authenticated`. Client RPCs are revoked from `public, anon` and granted to `authenticated`. RLS is on for every new table, with no direct client writes.
- Each database change is a new migration that copies the latest version of any function it changes. Push with `npx supabase db push --remote --yes` (approved), then check that advisors show 0 errors.

**Room server**
- It holds no Supabase secret. It needs only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as vars.
- Rooms hold at most **12** visible players, with slots 0–49.
- Places: `greenhaven`, `science_island`, `mathematics_mountains`, `technology_city`, `language_kingdom`.
- Emotes: `wave`, `cheer`, `clap`, `thumbs_up`, `good_luck`, `well_done`.
- Rate limits: the client sends at most **2 moves a second**, and the server accepts at most **4**. At most **1 emote every 2 seconds**. The `hello` must arrive within **5 seconds**.
- Close codes: **4001** (sign-in rejected), **4003** (banned), **4000** (protocol error or hello timeout).

**Privacy and safety**
- Other players never receive an account id, email, birth year, level or gold. Only `public_id`, name (or null), appearance, pet and the battle flag.
- No free text anywhere in this project.

**Client**
- Multiplayer is off when `VITE_ROOMS_URL` is unset, and the game behaves exactly as today. If the server is unreachable, show the quiet "Playing solo" note only.
- All player-facing text goes in en, ms, es, ar, zh, fr and ja. The admin page stays English-only.

**Repo hygiene**
- The test database is production. Write non-ASCII text with the Write tool. Never commit `.env.test.local` or any Cloudflare token.

## Review Focus

1. **Changing island while connected.** The old room must get `leave`, and the new room must get `join`. Other players from the old island must never be drawn on the new map. Covered by a test in Task 4 (`roomClient` reconnects on place change and clears players).
2. **The same account in two tabs.** The second connection replaces the first, and others see one hero, not two. Covered by a test in Task 3.
3. **A token that expires while playing.** A reconnect after about an hour must send a fresh access token, never a cached stale one. Covered by a test in Task 4 (each `hello` reads the current session token).
4. **A blocked player's emotes.** These must be hidden too, not only their hero. Covered by a test in Task 4 (the store drops emotes from blocked ids).
5. **Hidden players.** A player hidden from others, or an unapproved under-13, still sees everyone and gets `welcome`, but never appears to others and never counts toward the 12. Covered by tests in Task 3.

---

### Task 1: Visibility, public ids, room card and the name filter (database)

**Files:**
- Create: `content/blocked-words.txt`, with one lower-case word per line, `#` comments and blank lines allowed. It holds common English and Malay profanity, slurs and insults. Keep it reasonable: the list is reviewed by the owner.
- Create: `scripts/gen-blocked-words.py`, which writes `supabase/migrations/20261121090001_blocked_words.sql`. That migration upserts every word with `insert ... on conflict do nothing`.
- Create: `supabase/migrations/20261121090000_multiplayer.sql`.
- Create: `tests/rls/multiplayer.test.ts`.

**Interfaces (SQL):**
- **Columns:** `profiles.public_id uuid not null default gen_random_uuid() unique`, `profiles.multiplayer_banned boolean not null default false`, `user_privacy_settings.visible_to_others boolean not null default true`, `guardianships.hidden_by_parent boolean not null default false`.
- **Stopping players setting moderator flags:** players currently have an `update` grant on `profiles`. Check the foundation grants. If it exists, use `revoke update (multiplayer_banned, public_id) on public.profiles from authenticated`. If the table has a table-wide grant, column revokes don't apply: replace it with column grants for the columns the client actually updates, which you find with `grep -rn "from('profiles').update" src`.
- **Name filter:**
  - `blocked_words(word text primary key check (word = lower(word)))`, with no client access.
  - `name_ok(p_name text) returns boolean`, immutable-ish (`stable`). It normalises the name (lower case; map `0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s`; strip everything that isn't a letter) and fails if any blocked word is a substring. It is granted to `authenticated`, because the creator calls it to explain a refusal.
  - Trigger `characters_name_ok` (before insert or update of name): raise 'Please choose a different name' (22023) when the owner's age band is not `under13` and `not name_ok(new.name)`.
- **Visibility:**
  - `room_visible(p_user uuid) returns boolean` is internal. It is true when all hold: `visible_to_others`, not `hidden_by_parent`, not banned, and, if the player is under 13, a `guardianships` row exists.
  - `my_visibility() returns jsonb { visible, reason }`. `reason` takes the first that applies, in order: `'banned'`, `'parent'` (`hidden_by_parent`), `'awaiting_parent'` (under-13, no guardianship), `'off'` (`visible_to_others` false), or null.
- **`my_room_card() returns jsonb`:** `{ public_id, visible, can_emote, banned, name, appearance, pet }`.
  - `name` is null when there's no character or `not name_ok(name)`.
  - `appearance` is `characters.appearance` or null.
  - `pet` is `{species, stage, form, look}` from `player_pets`, or null.
  - `can_emote` is false when the player is under 13 and `parental_settings.chat_mode = 'off'`.

- [ ] **Step 1: Write the failing live tests** in `tests/rls/multiplayer.test.ts`, with an anonymous `player(birthYear)` helper as in `festivals.test.ts`:
  - `it('a room card shows the look and a random public id, never the account id')`:
    - An adult (2000) creates a character named `Test Rider`.
    - The card has a uuid `public_id` that is not equal to `auth.getUser().id`, `visible: true`, `can_emote: true`, `banned: false` and `name: 'Test Rider'`.
    - `JSON.stringify(card)` does not contain the user id.
  - `it('the word filter refuses a rude adult name, including leetspeak, and passes clean names')`:
    - Pick the first word from `content/blocked-words.txt` and turn it into leetspeak by replacing `o→0` and `e→3` where present.
    - Inserting a character with that name errors with `/different name/`.
    - `rpc('name_ok', { p_name: 'Sunny Day' })` returns true.
  - `it('an under-13 is hidden until a parent approves, and still has a card')`: a player with birth year (current year - 9) has `visible: false`, and `my_visibility().reason === 'awaiting_parent'`.
  - `it('turning yourself off hides you, and players cannot unhide themselves or unban')`:
    - `from('user_privacy_settings').update({ visible_to_others: false })` gives `reason: 'off'`.
    - Updating `profiles.multiplayer_banned` or inserting into `guardianships` has no effect on the card.

- [ ] **Step 2: Run** `npx vitest run -c vitest.rls.config.ts tests/rls/multiplayer.test.ts`. Expected: FAIL ("Could not find the function public.my_room_card").

- [ ] **Step 3: Write the word list, the generator and the migration.** Run `python scripts/gen-blocked-words.py`, then `npx supabase db push --remote --yes`.

- [ ] **Step 4: Run the tests** again, plus `tests/rls/rls.test.ts` (character creation still works). Expected: PASS.

- [ ] **Step 5: Commit** `feat(multiplayer): room cards, visibility and a name filter`. Add the `gen-blocked-words` line to CLAUDE.md in this commit.

### Task 2: Blocks, reports, bans and the parent switch (database)

**Files:**
- Create: `supabase/migrations/20261121090002_multiplayer_safety.sql`
- Modify: `tests/rls/multiplayer.test.ts`

**Interfaces (SQL):**
- **Blocks:**
  - `player_blocks(user_id uuid references auth.users on delete cascade default auth.uid(), blocked_public_id uuid not null, created_at, primary key (user_id, blocked_public_id))`.
  - `block_player(p_public_id uuid)` refuses blocking yourself with 'You cannot block yourself'.
  - `unblock_player(p_public_id uuid)`.
  - `my_blocks() returns uuid[]`.
- **Reports:**
  - `player_reports(id bigint identity pk, reporter_id uuid, reported_public_id uuid, reason text check in ('rude_name','bad_behaviour','other'), place text, status text default 'open' check in ('open','closed'), created_at)`.
  - `report_player(p_public_id uuid, p_reason text, p_place text)`:
    - refuses yourself ('You cannot report yourself');
    - refuses an unknown `public_id` ('No such player');
    - allows at most 10 reports per reporter in the last 24 hours ('Too many reports today').
- **Moderation**, guarded by `has_role(array['admin','moderator'])` with the error 'Not allowed':
  - `open_reports() returns jsonb`: `[{id, reported_public_id, name, reason, place, created_at, open_count}]`, newest first.
  - `close_report(p_id bigint)`.
  - `ban_from_multiplayer(p_public_id uuid, p_banned boolean)`. When banning, it also closes that player's open reports.
- **Parent switch:**
  - `set_child_visible(p_child uuid, p_visible boolean)` calls `own_child(p_child)`.
  - `my_children()` is copied from `20261118090000_parent_consent.sql` and adds `'visible', not g.hidden_by_parent`.

- [ ] **Step 1: Write the failing live tests** in `multiplayer.test.ts`:
  - `it('blocking is private and reversible')`: block another player's `public_id`; `my_blocks` contains it; unblock removes it; blocking yourself errors.
  - `it('reports need a real player, never yourself, and are limited')`: reporting yourself errors with `/yourself/`, and a random uuid errors with `/No such player/`. Ten valid reports succeed and the eleventh errors with `/Too many/`; use a second anonymous player as the target.
  - `it('players cannot see reports, ban, or switch someone else's child')`: `open_reports`, `ban_from_multiplayer` and `set_child_visible(other uid, false)` all error.
  - `it('a moderator ban shows on the card and closes the reports')`: admin client from `TEST_ADMIN_EMAIL`, skipped without it.
    - Ban the reported test player; their card has `banned: true, visible: false`, and `open_reports` no longer lists them.
    - Then unban.

- [ ] **Step 2: Run and see it fail. Step 3: Write the migration and push it. Step 4: Run and see it pass.**

- [ ] **Step 5: Commit** `feat(multiplayer): blocks, reports, moderator bans and the parent switch`

### Task 3: Room server

**Files:**
- Create: `server/rooms/package.json` (`wrangler` as a devDependency, scripts `dev: wrangler dev --port 8787` and `deploy: wrangler deploy`), `server/rooms/wrangler.toml` (name `eduventure-rooms`, `main = "src/index.ts"`, durable object binding `ROOM` → class `RoomObject`, `[[migrations]] tag = "v1", new_sqlite_classes = ["RoomObject"]`, vars `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`), `server/rooms/tsconfig.json`, `server/rooms/src/room.ts`, `server/rooms/src/index.ts`, `server/rooms/src/room.test.ts`, `server/rooms/smoke.mjs`, `server/rooms/README.md` (dev, deploy and token steps)
- Modify: `vite.config.ts` (test `include` adds `'server/**/*.test.ts'`), `.gitignore` (`server/rooms/node_modules`, `server/rooms/.wrangler`)

**Interfaces (`server/rooms/src/room.ts`, no Cloudflare imports):**
```ts
export const PLACES: readonly string[]
export const EMOTES: readonly ['wave','cheer','clap','thumbs_up','good_luck','well_done']
export const MAX_VISIBLE = 12
export type Card = { public_id: string; visible: boolean; can_emote: boolean; banned: boolean; name: string | null; appearance: unknown; pet: unknown }
export type Player = { card: Card; x: number; y: number; battle: boolean }
export type Out = { to: 'all-but' | 'one' | 'all'; conn: string; msg: object }   // conn = connection id
export class Room {
  constructor(now: () => number)
  join(conn: string, card: Card): Out[] | 'full'         // replaces an existing conn with the same public_id (that conn gets closed: Out msg {t:'replaced'})
  leave(conn: string): Out[]
  move(conn: string, m: { x: unknown; y: unknown; battle: unknown }): Out[]
  emote(conn: string, e: unknown): Out[]
  restore(conn: string, p: Player): void                  // after hibernation
  player(conn: string): Player | undefined
}
```
Message shapes are exactly as in the spec's Protocol section, except that `welcome` is `{ t: 'welcome', you, can_emote, players }`. The public player shape in `welcome.players` and `join.p` is `{ id, name, appearance, pet, x, y, battle }`, with no other card fields.

- [ ] **Step 1: Write the failing tests in `room.test.ts`:**
  - joining sends the joiner `welcome` (others only), and sends `join` to everyone else;
  - the 13th visible player gets `'full'`, but hidden players never count and are never announced;
  - a second connection with the same `public_id` replaces the first, which gets `replaced`, and others see no extra join;
  - moves are clamped to 0–200 and rounded to 2 decimals, with `battle` coerced to a boolean; a 5th move within one second is dropped;
  - emotes outside `EMOTES` are dropped, as are emotes within 2 s, emotes from `can_emote: false`, and emotes from hidden players;
  - `leave` sends `leave {id}` to the rest, and nothing for a hidden player.

- [ ] **Step 2: Run** `npx vitest run server/rooms`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement `room.ts`, then the `index.ts` wrapper:**
  - The Worker `fetch` validates `/room/:place/:slot` (place in `PLACES`, slot an integer 0–49, `Upgrade: websocket`) and forwards to `env.ROOM.get(env.ROOM.idFromName(`${place}:${slot}`))`.
  - `RoomObject` uses `this.ctx.acceptWebSocket(server)` and keeps per-socket `{conn, player | null, joinedAt}` in `serializeAttachment`. It rebuilds `Room` from `getWebSockets()` on wake.
  - `webSocketMessage` handles `hello` by fetching `${SUPABASE_URL}/rest/v1/rpc/my_room_card` (POST, headers `apikey`, `Authorization: Bearer <token>`, `Content-Type: application/json`, body `{}`). On a non-200 it closes with 4001; on `banned` it closes with 4003. It also handles `move` and `emote`.
  - A `setAlarm` 5 s after accept closes sockets that never said hello.

- [ ] **Step 4: Run the unit tests and see them pass.** Then run `npm install` in `server/rooms`, start `npx wrangler dev --port 8787` (background), and run `node server/rooms/smoke.mjs`. The smoke script signs in two anonymous Supabase players with characters (reading `VITE_*` from `.env.local`), connects both to `ws://localhost:8787/room/greenhaven/0`, and checks that B receives `join` for A and `move` after A moves. Expected: prints `smoke ok`.

- [ ] **Step 5: Commit** `feat(multiplayer): Cloudflare room server`

### Task 4: Room client and store

**Files:**
- Create: `src/features/multiplayer/roomClient.ts`, `src/features/multiplayer/useRoom.ts`, `src/features/multiplayer/roomClient.test.ts`, `src/features/multiplayer/multiplayerApi.ts`
- Modify: `.env.example` (add the commented `VITE_ROOMS_URL=`)

**Interfaces:**
- **`useRoom` (zustand):**
  ```ts
  { status: 'off'|'connecting'|'online'|'solo', you: string|null, canEmote: boolean,
    players: Record<string, OtherPlayer>, emotes: Record<string, { e: Emote; at: number }> }
  ```
  - `OtherPlayer = { id, name: string|null, appearance: Appearance, pet: Pet-like|null, x, y, battle }`.
- **`multiplayerApi.ts`:** `useBlocks(uid)` (query `my_blocks` → `Set<string>`, key `['blocks', uid]`), `blockPlayer(id)`, `unblockPlayer(id)`, `reportPlayer(id, reason, place)`, `useMyVisibility(uid)` (key `['visibility', uid]`), `setVisible(uid, visible)` (updates `user_privacy_settings`).
- **`roomClient.ts`:**
  - `export function startRoom(opts: { url: string; place: string; token: () => Promise<string|null>; WebSocketImpl?: typeof WebSocket; blocked: () => Set<string> }): { sendMove(x: number, y: number, battle: boolean): void; sendEmote(e: Emote): void; stop(): void }`.
  - It tries slots 0, 1, 2… on `full`.
  - Backoff is 1, 2, 4, 8, 16, 30 s on close or error, with status `solo` while waiting.
  - Each `hello` awaits `token()` fresh.
  - Messages from blocked ids are ignored.
  - `stop()` clears `players` and `emotes`.
  - `sendMove` throttles to 2 a second and always sends the last position after 500 ms.
- **`useRoomConnection(place: string)` hook** (in `useRoom.ts`):
  - It starts and stops with `place`, the session uid, and the visibility switch.
  - It returns the client, or null when `import.meta.env.VITE_ROOMS_URL` is empty (status `off`).

- [ ] **Step 1: Write the failing tests** with a `FakeSocket` class:
  - `full` moves to slot 1;
  - `welcome` and `join` fill `players`, and `leave` removes one;
  - a blocked id's `join`, `move` and `emote` are ignored;
  - a close schedules a reconnect with a 1 s, then 2 s delay (fake timers), status `solo`;
  - every `hello` calls `token()` again, so a refreshed token is used;
  - `stop()`, as on a place change, clears players and closes the socket;
  - `sendMove` sends at most 2 a second.

- [ ] **Step 2: Run** `npx vitest run src/features/multiplayer`. Expected: FAIL. **Step 3: Implement. Step 4: Run and see it pass.**

- [ ] **Step 5: Commit** `feat(multiplayer): room client`

### Task 5: Other players in the 3D world

**Files:**
- Create: `src/world3d/OtherPlayers.tsx`, `src/world3d/otherPlayers.ts` (pure: `glide(from: Point, to: Point, dt: number, speed = 3.2): Point` and `faceToward(from, to, current): number`), `src/world3d/otherPlayers.test.ts`
- Modify: `src/world3d/pet/PetFollower.tsx` (`sim` prop becomes `leader: { hero: { pos: Point; facing: number } }`; update the existing caller), `src/world3d/World3D.tsx` (render `<OtherPlayers reduced lowQuality/>`; a `useFrame` hook sends `sim.hero.pos` and the battle flag through the client returned by `useRoomConnection(map.id)`)

**Interfaces:**
- `OtherPlayers` reads `useRoom.players` and draws each as a group: `Blob`, `HeroModel` (speed driven by glide distance), a `PetFollower` with `leader` = that player's glided position, and a drei `<Html center distanceFactor={10}>` name tag (`name ?? t('multiplayer.player')`), a ⚔ badge when `battle`, and an emote bubble for 3 s.
- The name tag is a `<button aria-label={t('multiplayer.openCard', { name })}>` that sets `useGame.setState({ playerCard: id })`. Add `playerCard: string | null` to the store, default null.
- When `lowQuality` and there are more than 6 players, draw without pets.

- [ ] **Step 1: Write the failing tests:**
  - `glide` moves at most `speed*dt` toward the target and snaps when closer than 0.01;
  - `faceToward` keeps the current facing when not moving.

- [ ] **Step 2: Run and see it fail. Step 3: Implement. Step 4: Run** `npx vitest run src/world3d src/features/world` and see it pass.

- [ ] **Step 5: Check by eye:** two local browser pages against `wrangler dev`, with `VITE_ROOMS_URL=ws://localhost:8787` in `.env.local` (not committed). Take screenshots and read them.

- [ ] **Step 6: Commit** `feat(multiplayer): other players in the world`

### Task 6: Emotes, player card and solo note (HUD)

**Files:**
- Create: `src/features/multiplayer/EmoteBar.tsx`, `src/features/multiplayer/PlayerCard.tsx`, `src/features/multiplayer/RoomStatus.tsx`, `src/features/multiplayer/hud.test.tsx`
- Modify: `src/features/world/WorldPage.tsx` (render the three when status is not `off`), `src/i18n/locales/*.json`

**Interfaces:**
- **`EmoteBar({ onEmote })`:** a toggle button labelled `multiplayer.emotes` that opens 6 buttons labelled `multiplayer.emote.<id>`. A press calls `onEmote(id)` and also shows the bubble over the player's own hero (`useRoom.emotes[you]`).
  - It is hidden when `useRoom.canEmote` is false. Task 4 stores `can_emote` from `welcome` as `canEmote`.
- **`PlayerCard`:** shown when `useGame.playerCard` is set. It shows the name and two buttons:
  - `multiplayer.hide`: `blockPlayer`, then invalidate `['blocks', uid]`, remove the player from the store, and close the card;
  - `multiplayer.report`: shows 3 reason buttons (`multiplayer.reason.<r>`), calls `reportPlayer(id, r, place)`, then shows `multiplayer.reported` ("Thanks — a moderator will look at this.").
- **`RoomStatus`:** `multiplayer.solo` ("Playing solo") while status is `solo`; nothing otherwise.
- **i18n keys** in all 7 locales: `multiplayer.{player, openCard, emotes, emote.*, hide, report, reason.*, reported, solo, errors.tooMany}`.

- [ ] **Step 1: Write the failing tests:**
  - the emote bar sends `wave`;
  - the card's Hide calls `blockPlayer` and removes the player;
  - Report with `rude_name` calls `reportPlayer(id, 'rude_name', 'greenhaven')` and shows the thanks;
  - the solo note shows only in `solo`.

- [ ] **Step 2: Run and see them fail. Step 3: Implement, including the i18n. Step 4: Run** `npx vitest run src/features/multiplayer src/i18n` and see them pass.

- [ ] **Step 5: Commit** `feat(multiplayer): emotes, player card and solo note`

### Task 7: Settings and parent switches

**Files:**
- Modify: `src/features/world/WorldSettings.tsx` (+ its test), `src/features/parents/ParentPage.tsx` (+ its test), `src/i18n/locales/*.json`

**Interfaces:**
- **Settings:** a switch labelled `multiplayer.letSee`, from `useMyVisibility` and `setVisible`.
  - When `reason` is `parent`, `awaiting_parent` or `banned`, the switch is disabled and `multiplayer.hidden.<reason>` is shown.
  - Only shown when `VITE_ROOMS_URL` is set.
- **Parent page:** each child row gets a switch labelled `parents.letOthersSee`, calling `set_child_visible`, with its value from `my_children().visible`.

- [ ] **Step 1: Write the failing tests:**
  - the settings switch calls `setVisible(uid, false)`;
  - with `reason: 'parent'` it is disabled and the parent text shows;
  - the parent page switch calls `set_child_visible` with `{ p_child, p_visible: false }`.

- [ ] **Step 2: Run and see them fail. Step 3: Implement. Step 4: Run and see them pass.**

- [ ] **Step 5: Commit** `feat(multiplayer): visibility switches for players and parents`

### Task 8: Player reports in /admin

**Files:**
- Create: `src/features/admin/PlayerReports.tsx`, `src/features/admin/PlayerReports.test.tsx`
- Modify: `src/features/admin/AdminPage.tsx` (render it for admins and moderators; `isAdmin` already exists, add `moderator` to the role check for this section only)

**Interfaces:** `PlayerReports()` lists `open_reports()` rows (name or "Player", reason, place, time, open count). Each row has **Close** (`close_report`) and **Ban from multiplayer** (`ban_from_multiplayer(id, true)`), behind a confirm checkbox. A note explains adding a word to `blocked_words` in the Supabase table editor. English only.

- [ ] **Step 1: Write the failing test:** rows render; Close calls `close_report(7)`; Ban calls `ban_from_multiplayer(<pid>, true)` only after the confirm box is ticked.
- [ ] **Step 2: Run and see it fail. Step 3: Implement. Step 4: Run and see it pass.**
- [ ] **Step 5: Commit** `feat(multiplayer): player reports for moderators`

### Task 9: End-to-end test, docs and full checks

**Files:**
- Create: `playwright.multiplayer.config.ts`, with two webServers:
  - `cd server/rooms && npx wrangler dev --port 8787`;
  - `npx vite --port 5176 --strictPort` with `env: { VITE_ROOMS_URL: 'ws://localhost:8787' }`.
- Create: `tests/e2e/multiplayer.spec.ts`.
- Modify: `package.json` (script `test:e2e:mp`), `docs/decisions.md` (#42), `docs/ROADMAP.md` (multiplayer section), `CLAUDE.md` (room server dev and deploy commands; `VITE_ROOMS_URL`), `README.md` (deploy steps for the owner: Cloudflare account, `CLOUDFLARE_API_TOKEN`, `npm run deploy` in `server/rooms`, set `VITE_ROOMS_URL`).

- [ ] **Step 1: Write the end-to-end test** `two players see each other, wave, and a hidden player is not seen`:
  - Use two browser contexts and the `newPlayer` and `enterWorld` helpers, both on greenhaven.
  - Page A sees B's name tag; B presses the emote bar, then Wave, and A sees the wave bubble.
  - B turns off "Let other players see me" in Settings, and within 10 s A no longer sees B's tag.

- [ ] **Step 2: Run** `npx playwright test -c playwright.multiplayer.config.ts`. Expected: PASS. If wrangler can't start in this environment, record a ruling with the error output and rely on `smoke.mjs`.

- [ ] **Step 3: Write the docs.**

- [ ] **Step 4: Full checks:**
  - `npm test`: all pass;
  - `npx vitest run -c vitest.rls.config.ts tests/rls/multiplayer.test.ts tests/rls/rls.test.ts tests/rls/parents.test.ts`: pass;
  - `npm run build`: passes, and with `VITE_ROOMS_URL` unset there is no WebSocket attempt (checked by the Task 4 tests);
  - Supabase advisors: 0 errors;
  - `npx playwright test --project=online tests/e2e/world.spec.ts`: passes (single-player is unchanged).

- [ ] **Step 5: Commit** `feat(multiplayer): end-to-end test and docs`

## Plan rulings (made while planning)

- **The room server reads cards with the player's own token**, so a valid Supabase sign-in is the only check, and the server holds no secret. If this is wrong, a stolen token lets someone appear as that player for up to an hour, the same as stealing it for the app.
- **`welcome` also carries `can_emote`**, so the client can hide the emote bar without another round trip.
- **The `multiplayer` end-to-end test has its own Playwright config**, so normal `test:e2e` runs don't need wrangler.
- **Visibility changes reach other players on the next join.** The client reconnects itself straight away when its own switch changes, which is what the end-to-end test relies on.
