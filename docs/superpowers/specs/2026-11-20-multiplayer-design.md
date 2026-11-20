# Multiplayer: see other players — design

Date: 2026-11-20. Status: approved by the owner ("proceed"), with the reviewer's questions settled below.

## Intent

The owner wants players to see each other in the 3D world. That makes the islands feel alive, and it lays the ground for the whiteboard camps, where players gather and write. The audience is Malaysian students, many of them children, so safety comes first. Players see each other's heroes, pets and names, and they can only send emotes. Writing comes in the whiteboard project.

## Goals

- Players on the same island see each other walk, in rooms of up to **12**. When a room is full, the next one opens.
- Each other player shows their hero exactly as dressed, their pet following, a name tag, and a ⚔ marker while in a battle (or boss fight).
- **Emotes** with no text: wave, cheer, clap, thumbs up, "good luck", "well done". Each shows as a bubble over the player for about 3 seconds.
- **Safety:**
  - Tap a player to **hide them for me** (block) or **report** them, with a reason picked from a list.
  - Reports are listed in `/admin`.
  - The setting "Let other players see me" is on by default. A parent can switch it off for their child from the parent page.
- **Names:** a word filter (English and Malay) runs on the server. A character name that fails it can't be saved, and an existing name that fails shows as "Player" to others.
- **Free hosting:** a Cloudflare Workers room server on the free plan (owner's choice). Multiplayer is off until the server address is set, so the game works fully without it.

## Non-goals

- Text chat, friends, parties, trading, shared battles and world bosses.
- The whiteboard camps. That is the next project, and it builds on these rooms.
- Movement checked by the server. Positions are for display only, and nothing of value depends on them.
- Native apps. Android comes later and reuses this.

## Anti-goals

- **A child seeing or sending free text.** Emotes only; names are filtered or come from the safe list.
- **Revealing who someone really is.** No emails, no account ids, no birth years, and no levels or gold, to avoid showing off. Other players see a random `public_id`, never the account id.
- **Lag that ruins the single-player game.** If the room server is slow, unreachable or full, the game carries on as today, with a quiet "Playing solo" note.
- **Surprise costs.** Stay well within Cloudflare's free plan: 100,000 requests a day, incoming WebSocket messages billed at 20:1, outgoing messages free, and no duration charges while idle with the Hibernation API.

## Constraints

- **Stack:**
  - Client: React 19 + R3F, zustand game store, TanStack Query.
  - Data: Supabase Postgres. Every rule lives in `security definer set search_path = ''` functions.
  - Room server: a new Cloudflare Worker with SQLite-backed Durable Objects, using the WebSocket Hibernation API (`ctx.acceptWebSocket`). It lives in `server/rooms/` (its own `wrangler.toml` and `package.json`, with `wrangler` as a devDependency).
- **Credentials:**
  - The room server holds no Supabase secret. It only needs `SUPABASE_URL` and the publishable key (both public).
  - It checks a joining player by calling a Supabase function with that player's own access token. If Supabase rejects the token, the join is refused.
- **Client configuration:** `VITE_ROOMS_URL`, for example `wss://eduventure-rooms.<account>.workers.dev`. When it is unset, multiplayer is off.
- **Deployment:** needs the owner's `CLOUDFLARE_API_TOKEN` in `.env.local`. Building and testing locally with `wrangler dev` needs no account.
- **Text:** all player-facing text in 7 locales. The admin page stays English-only.

## Approaches considered

1. **Cloudflare Durable Objects room server (chosen by the owner).** One object per island room, with outgoing messages free. It needs a free Cloudflare account and a deploy step.
2. **Supabase Realtime broadcast.** It needs no new service, but every message is billed once per recipient. The free plan (2 million a month, 100 a second) covers only about 17 hours of one full island a month. Rejected on cost.
3. **"Ghosts" polled from the database every ~15 seconds.** Free and simple, but players don't really see each other move. Rejected.

## Design

### Database (migration, pushed with approval)

- **Public ids and visibility**
  - `profiles.public_id uuid not null default gen_random_uuid() unique`. A random id shown to other players, unrelated to the account id.
  - `user_privacy_settings.visible_to_others boolean not null default true`. This is the player's own switch, and they can write it as they do the rest of their privacy row.
  - `guardianships.hidden_by_parent boolean not null default false`. This is the parent's switch; the child can't touch it, because players have no access to `guardianships`.
  - `profiles.multiplayer_banned boolean not null default false`. Set by moderators.
  - **Effective visibility** (owner's decision for under-13s, the rest my calls). A player is visible when all of these hold:
    - `visible_to_others`;
    - not `hidden_by_parent`;
    - not banned;
    - and, for under-13s, a parent has approved the account (a `guardianships` row exists). **Under-13s are hidden until a parent approves.** They still see other players.
    - Under-13s whose `parental_settings.chat_mode = 'off'` can't send emotes. The card carries `can_emote`, and the room drops their emotes.
  - Banned players can't join rooms at all: the card says `banned`, and the room closes with 4003.
- **Word filter**
  - Table `blocked_words(word text primary key)`, seeded with English and Malay profanity and insults, lower-case. There is no client access.
  - `public.name_ok(p_name text) returns boolean` fails when any blocked word appears in the name. It lower-cases the name, maps common leetspeak (`0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s`) and strips non-letters before checking.
  - A trigger on `characters` insert and update of `name` raises 'Please choose a different name' when `not name_ok(name)` and the player is 13 or over. Under-13 names come from the safe list, which is checked elsewhere.
- **`public.my_room_card() returns jsonb`**, called by the room server with the player's own token. It returns:
  ```
  { public_id, visible, can_emote, banned, name: name_ok(name) ? name : null,
    appearance, pet: { species, stage, form, look } | null }
  ```
  It raises 'Not signed in' without a user. The name is null when the filter fails, and the client shows "Player".
- **Blocks:** `player_blocks(user_id, blocked_public_id, created_at, primary key (user_id, blocked_public_id))`.
  - RPCs `block_player(p_public_id)`, `unblock_player(p_public_id)` and `my_blocks() returns uuid[]`.
  - Blocking is one-sided and only hides them for me. They are not told.
- **Reports:** `player_reports(id, reporter_id, reported_public_id, reason, place, created_at, status 'open'|'closed')`.
  - `reason` is in `('rude_name', 'bad_behaviour', 'other')`.
  - `report_player(p_public_id, p_reason, p_place)` is limited to 10 reports a day per reporter, and refuses reporting yourself.
  - `open_reports()` is for admins and moderators (`has_role(array['admin','moderator'])`). It returns each report with the reported player's current character name and `public_id`, plus how many open reports that player has.
  - `close_report(p_id)` closes a report.
  - `ban_from_multiplayer(p_public_id, p_banned boolean)` sets or lifts the ban, and closes that player's open reports when it bans.
  - Rude names that slip past the filter: the moderator adds the word to `blocked_words` in the Supabase table editor. The player's name then shows as "Player", and they must pick a new name next time they save their character.
- **Parent control:** `set_child_visible(p_child uuid, p_visible boolean)` writes `guardianships.hidden_by_parent = not p_visible`, guarded by the same ownership check as `set_child_limit` (`own_child`). `my_children()` also returns `visible` for each child.
- **The player's own state:** `my_visibility()` returns `{ visible, reason }`. `reason` is one of `null`, `'off'`, `'parent'`, `'awaiting_parent'` or `'banned'`, so Settings can explain why they're hidden.
- **When changes take effect:** the card is read when a player joins a room, so parent switches, bans and name changes apply at the player's next join. The player's own client reconnects straight away when its own switch changes. Joins also happen on every island change and every reconnect. My call: a room holds no Supabase secret and the player's token expires within the hour, so re-checking cards while connected isn't worth the complexity.
- **Grants:** RLS on every new table, with no direct client writes. Clients reach everything through the functions above.

### Room server (`server/rooms/`)

- **Worker routing:** `GET /room/:place/:slot` upgrades to a WebSocket and is routed to the Durable Object `ROOM` named `${place}:${slot}`.
  - `place` must be one of the built places: greenhaven, science_island, mathematics_mountains, technology_city and language_kingdom. Anything else gets 400.
  - `slot` is 0–49.
- **Pure room logic** in `server/rooms/src/room.ts`, unit-tested without Cloudflare. It is a class `Room` with:
  - `join(conn, card)`: returns `'full'` at 12 visible players. Hidden players (visible = false) don't count toward the 12.
  - `leave(conn)`.
  - `move(conn, msg)`: rate limit of 4 a second (the client sends 2). Each coordinate is clamped to 0–200 and kept to two decimals. `battle` is a boolean.
  - `emote(conn, e)`: `e` must be in the 6 emote ids, at most one every 2 seconds.
  - `snapshot()`.
  - Each returns the messages to send.
- **Joining:**
  1. The first client message must be `{ t: 'hello', token }` within 5 seconds, otherwise the server closes the connection.
  2. The object calls `POST {SUPABASE_URL}/rest/v1/rpc/my_room_card` with `Authorization: Bearer token` and `apikey`.
  3. If the call fails, the server closes with 4001.
  4. A second connection from the same `public_id` replaces the first.
- **Protocol** (JSON):
  - Client → server: `hello`, `move {x, y, battle}`, `emote {e}`.
  - Server → client:
    - `welcome {you: public_id, players: [...]}` (everyone else visible);
    - `join {p}`;
    - `move {id, x, y, battle}`;
    - `emote {id, e}`;
    - `leave {id}`;
    - `full`. The client then tries the next slot.
  - A hidden player gets `welcome` and sees everyone, but is never sent to others.
- **No storage:** the object keeps no stored state. Room membership lives on the hibernation attachments (`serializeAttachment`), so it survives hibernation.

### Client

- **`src/features/multiplayer/`**
  - `roomClient.ts`: connects to `${VITE_ROOMS_URL}/room/${place}/${slot}`, sends `hello` with the Supabase access token, and tries slots 0, 1, 2… on `full`. It reconnects with backoff (1, 2, 4, up to 30 seconds) and reconnects when the place changes. It exposes a zustand store `useRoom`: `{ status: 'off'|'connecting'|'online'|'solo', players: Map<id, OtherPlayer>, emotes }`.
  - The hero's position is sent at most **2 times a second** while it changes, plus once when it stops. Other players glide between updates. My call, for free-plan headroom: one player walking non-stop is 7,200 incoming messages an hour, which bills as 360 requests. So 100,000 requests a day covers about 270 player-hours of walking. When Cloudflare refuses because the quota is used up, clients fall back to the "Playing solo" note and retry with backoff. There is no server-side cap. It is read from the game sim. The `battle` flag comes from `useGame` battle or boss state.
  - Blocked `public_id`s (from `my_blocks`) are filtered out before drawing.
- **3D:** an `OtherPlayers` component inside `World3D` draws each other player.
  - It reuses `HeroModel` and the pet model. Movement glides between updates at walking speed and turns to face the direction of travel.
  - Name tags and emote bubbles use drei `Html`.
  - Other players never block movement and never trigger battles.
  - On low quality, more than 6 other players are drawn without pets.
- **HUD:**
  - An emote button opens 6 emote buttons. Each sends one emote; the player's own emote also shows over their own hero.
  - Tapping another player's name tag opens a small card: their name, "Hide this player", and "Report" with the reason list.
  - A quiet status line, "Playing solo", shows when the server is set but unreachable. Nothing shows when it's off.
- **Settings:** a "Let other players see me" switch, and a parent page switch for each child.
- **Admin:** a "Player reports" section in `/admin` (admins and moderators) lists open reports, with Close and "Ban from multiplayer" buttons, and a short note on adding a word to `blocked_words`.
- **Settings text** explains a hidden state: "Your parent has turned this off", "Hidden until a parent approves your account", or "You can't join other players right now".

### Testing

- **Unit (Vitest, main repo):**
  - `room.ts`: join, full at 12, hidden players not counted, rate limits, clamping, a second connection replacing the first, leave messages, emotes limited to the allowed ids.
  - `roomClient`: slot fallback on `full`, backoff, blocked players filtered (with a fake WebSocket).
  - Components: the emote bar, the player card's block and report calls, and the solo note.
- **Live database tests (Vitest RLS):**
  - `my_room_card` shape, with no account id in it.
  - The name filter: the trigger refuses a bad name for an adult, `name_ok` catches leetspeak, and a clean name passes.
  - Block and unblock.
  - `report_player` limit and refusing yourself.
  - `open_reports` admin-only.
  - `set_child_visible` for a non-guardian is refused.
  - `ban_from_multiplayer` and `open_reports` refuse players.
  - An unapproved under-13's card has `visible: false`, and a player can't make themselves visible by writing `guardianships` or `profiles`.
- **End-to-end:** two browser pages run against `wrangler dev` (local, no account) with `VITE_ROOMS_URL` pointing at it. Each sees the other's name tag, an emote shows on the other page, and a hidden player isn't seen. This is a separate Playwright project, `multiplayer`, because it needs the local room server running.

## Left to the builder

- The exact blocked-word seed list. It must cover common English and Malay slurs and insults. Keep it in a reviewed content file, `content/blocked-words.txt`, turned into a migration.
- Name tag styling, emote icons, and the exact backoff.
- How the hero position is read from the sim (store subscription or a frame hook).
- The Worker's name in `wrangler.toml` (`eduventure-rooms`).
