# EDUVENTURE — Master Roadmap

## Context

The project folder is empty (no code, no git). The brief describes a full educational MMORPG in 24 parts, which is really about ten projects stacked on each other. This roadmap puts them in a build order where every phase ends with something you can run and check, so we can walk through them one at a time.

Decisions you confirmed (16 Nov 2026):

| Decision | Choice |
|---|---|
| Game art | I draw original vector art in code now; you swap in your own art later, file by file |
| Backend | Free cloud Supabase project (you create it, keys go in a local `.env.local`) |
| First content | International core (tagged by UNESCO ISCED level) + Malaysia (KSSR / KSSM / SPM) as the first country mapping |
| Location | Project moves to `C:\dev\eduventure` (out of OneDrive), backed up with Git |

## How we walk through it

Each phase follows the same five steps:

1. **Design chat.** A short conversation about that phase, then a detailed task list saved as `docs/phases/phase-N.md`.
2. **Build in small slices.** Each slice runs before the next one starts.
3. **Check.** Automated tests plus the phase's "done when" list, shown working.
4. **Report.** What is done, what is not, what you need to do.
5. **You approve**, then the next phase starts.

A phase is finished when its "done when" list passes, not when I say so.

## Approach

**Chosen: shared world, server-checked learning.** The game runs in the browser (React for screens, Phaser 3 for the world). Supabase holds all data. Every reward (XP, gold, items, rankings) is calculated inside the database by protected functions; the browser can only ask, never write. Other players appear through Supabase Realtime. There is no separate game server to rent or maintain.

Alternatives considered and dropped:

- **Dedicated game server (e.g. Colyseus) plus Supabase.** Gives server-verified movement, but costs hosting and a lot more code. Combat here is question-based and per player, so the server only needs to verify answers, which the database already does. This stays as the upgrade path if verified movement ever matters.
- **Unity or Godot exported to web and Android.** Better art tooling, but heavy downloads on mobile web, harder admin and educator screens, and I cannot operate an editor GUI.

Known limit of the chosen approach: other players' positions are display-only (nothing of value depends on them), and each region is split into instances with a player cap.

## Design calls I made (correct any of these)

- **Guest play.** "Start Your Adventure" creates a guest account with no personal data, and progress is saved on the server. Guests can upgrade to a full account later. Guests are excluded from chat, leaderboards and friends.
- **Three age bands, set from birth year at signup.**
  - Under 13: sign-up uses a guardian's email; names come from a safe generator (no free-text names); chat is preset phrases and emotes only; friends only by code.
  - 13 to 17: filtered text chat in public and clan channels; private messages only with accepted friends; messages containing phone numbers, emails or social handles are blocked.
  - 18 and over: standard filtered chat. No adult-to-minor private messages except through a friend code.
- **Answers never reach the browser before the player answers.** The answer key lives in a table the client cannot read; a database function marks the answer and returns the explanation.
- **Questions are shown as normal web UI on top of the game**, not drawn inside the game canvas, so screen readers, translations and right-to-left layouts work.
- **One character drawing function** (`renderCharacterSvg`) is used by both the character creator preview and the game world, so they can never disagree. Hair, clothes, weapon and so on are separate layers.
- **World logic runs on a plain grid** (movement, collision), drawn with an isometric projection. Maps are data files in Tiled format, so new regions reuse the same system and you can edit maps in the free Tiled editor.
- **Database tables arrive with the phase that uses them.** The brief lists about 75 tables; creating them all now would mean guessing. Each phase adds its own migration.
- **Dependencies are installed when first used.** Phaser comes in Phase 2, Capacitor in Phase 7. GSAP is dropped: CSS and Framer Motion cover the same animations (your rule 15, no unnecessary dependencies). Zustand (small) is added to pass state between React and Phaser; i18next handles languages.
- **All seven languages exist from Phase 1** for interface text. English is the source; I draft the others and mark them "unreviewed". Questions stay in their original language.

## Things worth knowing before we start

1. **The loading artwork has interface elements painted into it** (progress bar, "78%", tip strip, sound button). I will place live elements exactly over them. Because the picture is one flat layer, I can do breathing, bounce and wiggle reactions using clipped copies of the image, but true blinking needs separated art. A version of the illustration without the bar, percentage, tip strip and sound button would look cleaner. Optional, not blocking.
2. **Several of the suggested sources are non-commercial licences.** As far as I know, Khan Academy, CK-12 and MIT OpenCourseWare do not allow commercial reuse, while most OpenStax books allow reuse with credit. Plan: use all of them as references for learning objectives and write original questions; adapt wording only from sources that allow it. I will verify each licence at the start of Phase 3.
3. **Questions I write are not "verified" until a person approves them.** They enter as "in review" with source and objective attached, pass automated checks, and a reviewer (you or an educator) publishes them through the admin screen.
4. **Some things code cannot deliver:** legal review for child privacy laws, human moderators for reports, native-speaker translation review, and final art. The roadmap marks where each is needed.
5. **Supabase free tier** is fine for development but pauses idle projects and limits sign-up emails per hour. I have not checked the current limits; we check them before any public launch.

## Roadmap

| Phase | You end up with | Size | Needed from you |
|---|---|---|---|
| 0. Setup | Project folder, git, tools, Supabase connected | S | Supabase project + keys; Node.js installed |
| 1. Foundation | Loading screen, welcome page, accounts, academic onboarding, character creator | L | Optional clean loading art |
| 2. Playable game | Greenhaven Village: walk, talk, fight monsters by answering, earn XP and gold | XL | Play-test on your phone |
| 3. Education | 500-question bank, review workflow, adaptive practice, missions, streaks | XL | Review and approve questions |
| 4. Customization | Inventory, shop, equipment, pets, personal island, skill tree | L | Replacement art as you make it |
| 5. Multiplayer and safety | See other players, friends, chat with age rules, moderation, clans | XL | Legal review before public launch |
| 6. Competitive | Leaderboards, tournaments, world boss, clan wars, events, achievements | L | |
| 7. Android and iOS | Capacitor app, debug APK on a real phone, iOS build | M | Android Studio and a phone; for iOS a Mac (or a cloud Mac build service) and an Apple developer account |
| 8. Polish | Sound, performance, accessibility, security review, deployment guide | L | Translation review |
| 9. Schools and expansion | Classes, assignments, institution views, more regions, trading | ongoing | |

### Phase 0 — Setup
- Create `C:\dev\eduventure`, `git init`, `.gitignore` (including `.env.local`).
- Copy your two images out of the temp upload folder before it is cleaned:
  - `...\images\1.png` to `public/assets/loading/eduventure-loading.png`
  - `...\images\2.jpg` to `docs/reference/isometric-style.jpg` (mood reference only, never shipped)
- Save this roadmap as `docs/ROADMAP.md`, and add a short `CLAUDE.md` with the standing rules below so later sessions follow them.
- You: create the Supabase project, paste URL and public key into `.env.local`, then reopen VS Code in `C:\dev\eduventure`.
- **Done when:** `npm run dev` shows a blank app that reads from your Supabase project.

### Phase 1 — Foundation (detailed below)

**Status (2026-11-16): built, awaiting owner sign-off.** Branch `phase-1`. Automated: 48 unit tests, 11 access-rule tests against the live project, 6 end-to-end tests, production build, Supabase advisors 0 errors. Still to check by the owner: real sign-up / password-reset emails (needs Site URL + redirect URLs in the Supabase dashboard) and a run on a real phone. Task list and rulings: `docs/phases/phase-1.md`.

### Phase 2 — Playable game

**Status (2026-11-16): built and merged.** 73 unit, 21 access-rule (live project) and 8 end-to-end tests pass; Supabase advisors 0 errors. Owner to do: review the 70 starter questions at `/dev/questions` (dev server) and play on a real phone. Task list and build record: `docs/phases/phase-2.md`. Art replacement guide: `docs/art-spec.md`.
- Phaser 3 world: Greenhaven Village map, grid movement (WASD, arrows, virtual joystick, tap), collision, camera follow, interact button, NPC dialogue, minimap.
- Code-drawn art set: grass, path and water tiles, plants, 3 monster types, NPCs, all loaded through an asset manifest. `docs/art-spec.md` tells you the size and format for each replacement file.
- Battles: meeting a monster starts a server-side encounter; each answer goes to the database, which works out damage, combo, XP and gold. A wrong answer shows the explanation and costs little.
- Starter set of about 60 questions (multiple choice, true/false, numeric, fill in the blank).
- HUD: level, XP bar, gold, health, energy. Separate desktop and mobile layouts.
- **Done when:** on desktop and on your phone you can walk around, talk to an NPC, beat three monster types, level up, and still have your progress after a reload. Sending fake answers or writing to the wallet directly earns nothing.

### Phase 3 — Education
**Status (2026-11-16): built and merged.** 510 questions (150 primary, 200 secondary, 150 pre-university/university, 10 all-level) across 8 question types and 25 subjects, all in review for the owner in `/admin`. Review workflow with history, adaptive practice, missions and streaks, Academic Library and the Greenhaven Guardian boss. The in-app question editor, image questions and status export were moved to later phases (decision #19). Task list and build record: `docs/phases/phase-3.md`.

- Full education tables: topics, learning objectives, courses, sources and licences, reviews, mastery, versions, audit history.
- Question files in the repo, checked automatically (format, duplicates, exactly one right answer, an explanation for every wrong option, numeric answers recomputed), then imported.
- 500 questions: 150 primary, 200 secondary, 150 pre-university and university, tagged by ISCED level and mapped to KSSR / KSSM topics.
- More question types: multi-select, matching, ordering, short answer, image and diagram.
- Admin and educator screens: add, edit, review, approve, reject, import, find duplicates, statistics. Workflow: Draft, Review, Approved, Published.
- Adaptive practice from topic mastery (accuracy and repetition, not speed), daily and weekly missions, streaks with rest days, the Academic Library, a region boss with multi-subject rounds.
- **Done when:** all 500 pass the checks and carry a source; only published questions are served in production; weak topics come up more often; missions pay out from the server.

### 3D world (between Phases 4 and 5) — built and merged
The owner asked for a Clash-style 3D world before the rest of Phase 4. Spec: `docs/superpowers/specs/2026-11-16-3d-world-design.md`; plan: `docs/superpowers/plans/2026-11-16-3d-world.md`. Greenhaven is now real 3D with a fixed 52° camera, smooth blended hero animation, moving water, swaying trees and grass, hopping monsters, coins that fly to the gold counter, and one 3D hero used everywhere. Next projects in the same request, each with its own design: subject islands, the Coding island (Python and JavaScript in the browser, then Java on a server), and the Languages island.

### Island world (project 2 of the same request) — built and merged
Spec: `docs/superpowers/specs/2026-11-16-island-world-design.md`; plan: `docs/superpowers/plans/2026-11-16-island-world.md`.
- Greenhaven became **Greenhaven Kampung**, the hub, with a jetty and Pak Hamid the boatman.
- A skippable **boat ride** takes players to two islands, both open from the start: **Science Island (Hutan Borneo)**, with a Malaysian theme, and **Mathematics Mountains**, with an international theme.
- Each island has its own scenery, 3 monsters and a level-5 boss (Raja Rafflesia, the Abacus Titan). Island monsters ask that island's subjects, chosen on the server.
- One server-side unlock list gives: Second Chance (level 3), titles (levels 4, 10 and 15), island bosses and rare items (level 5), the swift perahu (level 7), 50/50 (level 8) and epic items (level 10).
- Technology City and Language Kingdom show on the jetty as "Coming soon". They are projects 3 and 4.

**Malaysian outreach ideas (noted, not built):**
- festival events for Hari Raya, Chinese New Year, Deepavali and Merdeka, inclusive of everyone;
- Malaysian food as energy items: nasi lemak, roti canai, teh tarik;
- traditional outfits in the shop: baju Melayu, baju kurung, batik, cheongsam;
- "SPM practice" labels on questions already tagged to KSSR, KSSM and SPM;
- school leaderboards for Malaysian schools;
- native Malay speakers reviewing the Bahasa Melayu text.

**Rules for any Malaysian content:** no real brands or branded buildings, no religious sites or symbols, and no flags or emblems as decoration.

### Coding island (project 3 of the same request) — built and merged
Spec: `docs/superpowers/specs/2026-11-17-coding-island-design.md`; plan: `docs/superpowers/plans/2026-11-17-coding-island.md`.
- **Technology City** is reached by boat. It has:
  - code-reading monsters: Bugsy, Byte-bot and Loopy;
  - the Glitch Golem boss at level 5;
  - the Code Academy, with Cikgu Byte at the door. The Academy is also reachable from Home.
- **Two beginner courses,** Python Basics and JavaScript Basics. Each has 3 units × 4 lessons (24 lessons, 144 steps), made of Learn, Predict, Fix and Write steps.
- **Real code runs in the browser:** JavaScript in a worker, and Python through Pyodide, downloaded only for the first Python lesson. There is a 3-second limit and a 200-line output cap.
- **Marking and rewards:** the server marks Predict and Fix steps and pays 25 XP and 10 gold once per lesson.
- **Content checks:** every lesson sample and every one of the 60 new code-reading questions is executed by the tests.
- **Review:** lessons are reviewed in `/admin` under "Code Academy lessons".

**Later:**
- Java on a server sandbox;
- harder tracks (SPM Computer Science, university);
- more units;
- lesson text in Malay;
- a free-play sandbox.

### Phase 4 — Customization
**Status (2026-11-16): gear slice built and merged.** Shop with 11 items (common 80–150, rare 500–600, epic 2,000–2,200 gold), server-side purchase, ownership enforced in the database, owned items selectable in the creator and drawn everywhere. Pet, island and skill tree still to build. Build record: `docs/phases/phase-4.md`.

- Item catalogue with rarities, inventory, shop (atomic purchase on the server), equip and unequip with layered rendering.
- Knowledge pet that grows with learning milestones; skill tree unlocked by subject mastery.
- Personal island (this is the "personal base" and "personal island" as one feature): five upgrade tiers, drag, rotate and remove furniture, placement checked on the server.
- **Done when:** buying, owning and equipping shows on your character in the world; a purchase without enough gold is refused even when sent directly to the API; furniture stays where you put it.

### Phase 5 — Multiplayer and safety
- Other players visible per region instance; friends by request or code; parties.
- Chat channels (global, regional, clan, party, friend, event). Every message goes through a server function: age rules, rate limit, word filter, personal-information detection.
- Mute, block, report; moderator queue; guardian controls; privacy settings.
- Clans: roles, bank, announcements, headquarters, cooperative missions that reward only those who contributed.
- **Done when:** two browsers see each other move; an under-13 test account cannot send free text or receive messages from strangers; a message with a phone number is blocked; a report reaches the moderator queue.

### Phase 6 — Competitive
- Leaderboards built only from real data (empty state when there is none), accuracy-weighted, private display names, guests excluded.
- Tournaments, world boss with shared health, clan wars, seasonal event framework, achievements and titles, pet evolutions.
- **Done when:** two players damage the same world boss; farming the same question repeatedly stops paying.

### Phase 7 — Android and iOS
- The same Capacitor project builds both. Google Play costs $25 once; the App Store costs $99 a year and needs a Mac or a cloud Mac build service. Both stores have extra rules for apps used by children under 13.
- Capacitor project, safe areas, back button, full screen, icons, splash, offline and reconnect handling.
- Written steps for debug and release APKs.
- **Done when:** a debug APK is built on your PC and played on a real phone. I will not report an APK as built unless that happened.

### Phase 8 — Polish
- Sound effects and music, animation pass, sprite atlases, low-performance and reduced-data modes.
- Accessibility audit (keyboard, screen reader, contrast, reduced motion), security review of every access rule and rate limit, deployment guide.

### Phase 9 — Schools and expansion
Educator classes and assignments, institution dashboards, essay questions with instructor marking, programming challenges (needs a sandboxed code runner), player trading, study partners, the remaining 11 regions one at a time, professional translations.

## Phase 1 in detail (the first build)

Stack installed in this phase: React, TypeScript, Vite, Tailwind, React Router, Supabase client, TanStack Query, Zustand, Zod, React Hook Form, i18next, Framer Motion, Lucide, Three.js with React Three Fiber and Drei (landing page only, loaded on demand), Vitest, Playwright. Versions are checked against current docs at install time.

Build order:

1. **Scaffold and design system.** Colour tokens from your reference (grass green, path orange, cream, water blue, wood brown), rounded display font plus readable body font (self-hosted), and the base components: Button, Panel, Card, ProgressBar, Modal, Field. A `/styleguide` page shows them all.
2. **Loading screen** (`src/features/loading/`). Your artwork in a fixed-ratio frame with live elements over the painted ones.
   - Progress is driven by real startup tasks (code chunks, fonts, language file, session check), never a timer.
   - Rotating tips and educational facts, sound toggle (sound starts after the first tap, a browser rule), floating leaves, pointer parallax.
   - Click reactions on the boy, the girl, the cat, the slime and the dinosaur.
   - Portrait phone layout crops to the characters with the live panel at the bottom.
   - Reduced-motion setting turns movement off.
3. **Welcome page.** Title, tagline and four working buttons:
   - Start Your Adventure: guest account, then onboarding.
   - Login and Create Account: the forms.
   - Explore the World: a showcase of the twelve regions.
   - A 3D hero (floating island and rotating book, cap and compass built from simple shapes) with a static fallback for weak devices.
4. **Accounts** (`src/features/authentication/`). Guest, sign-up with email verification, login, password reset, birth-year age band, guardian-email path for under 13.
5. **Academic onboarding** (`src/features/onboarding/`). Eleven level cards, then country, curriculum, grade, language, subjects, goals and difficulty. Options come from database reference tables: all countries listed, with "International" and Malaysia having real curricula for now. Editable later in Settings.
6. **Character creator** (`src/features/character/`). Body, skin, hair, eyes, face, clothing, shoes, accessories, starting weapon, backpack, name; live preview from `renderCharacterSvg`. Everything free.
7. **Home screen.** Shows your character and profile, with the world entrance clearly marked "opens in Phase 2".
8. **Database migration** (`supabase/migrations/0001_foundation.sql`).
   - Tables: profiles, settings, privacy settings, parental settings, academic profiles, reference tables (education levels, countries, curricula, grades, subjects), characters and customizations, XP and wallet rows, audit log, admin roles.
   - Row Level Security on every table; XP and wallet are read-only to the client.

Main files:

```
C:\dev\eduventure\
  CLAUDE.md, README.md
  docs/ROADMAP.md, docs/decisions.md, docs/phases/phase-1.md
  public/assets/loading/eduventure-loading.png
  src/app/            App, router, providers, boot tasks
  src/components/ui/  Button, Panel, Card, ProgressBar, Modal, Field
  src/features/loading/ authentication/ onboarding/ character/ landing/
  src/services/supabase.ts
  src/i18n/locales/   en, ms, es, ar, zh, fr, ja
  supabase/migrations/0001_foundation.sql
  supabase/seed/reference_data.sql
  tests/e2e/first-run.spec.ts, tests/rls/rls.test.ts
```

**Phase 1 is done when:**
- The loading screen shows your art with real progress, tips, sound toggle and click reactions, at desktop and phone sizes.
- All four welcome buttons do something real.
- Guest start, onboarding and character creation lead to the Home screen, and everything is still there after a reload.
- Sign-up with email verification, login and password reset work against your Supabase project.
- An under-13 birth year leads to the guardian path and generated names.
- Arabic switches the layout to right-to-left.

## Where each part of your brief lands

| Brief part | Phase |
|---|---|
| 1 Vision, 23 Rules | Every phase |
| 2 Visual identity | 1 (design system, loading, 3D landing), 2 (world art) |
| 3 Architecture, 24 First task | 0 and 1 |
| 4 First-time experience | 1 |
| 5 Game world | 2 (Greenhaven), 9 (other regions) |
| 6 Question system | 2 (starter set), 3 (full bank and admin) |
| 7 Learning gameplay | 2 (battles), 3 (missions, streaks, adaptive, boss) |
| 8 Progression and economy | 2 (earning), 4 (spending) |
| 9 Customization, 14 Inventory and shop | 1 (creator), 4 (items); trading in 9 |
| 10 Housing | 4 |
| 11 Clans, 12 Friends and chat | 1 (age bands, privacy tables), 5 |
| 13 Leaderboards, 15 Events | 6 (pets and skill tree in 4) |
| 16 Interface | 2, then extended each phase |
| 17 Database, 18 Security and performance | Each phase adds its part; full audit in 8 |
| 19 Accessibility and languages | 1 (framework), 8 (audit) |
| 20 Admin and educator | 3 (content), 5 (moderation), 9 (schools) |
| 21 Android | 7 |

## Standing rules (go into `CLAUDE.md`)

- XP, gold, items and rankings change only through database functions. The client never writes them.
- No fake players, fake chat or fake leaderboard rows. Empty states instead.
- Every visible button works or is labelled as planned.
- A question is published only after a person approves it; every question has a source, licence and learning objective.
- Age-band rules are enforced on the server, not only in the interface.
- No secret keys in the frontend; `.env.local` is never committed.
- Every database change is a migration file.
- Nothing is reported as working (external service, APK, test) unless it was actually run.

## Verification

For Phase 1, run from `C:\dev\eduventure`:

- `npm run dev`, then go through the "done when" list by hand at desktop width and in the browser's phone view, and on your own phone over the local network.
- `npm test` — unit tests for age bands, onboarding validation, character rendering and the loading progress logic.
- `npm run test:e2e` — Playwright runs loading, welcome, guest start, onboarding and character creation end to end.
- `npm run test:rls` — two test accounts confirm that one cannot read or change the other's data and that neither can change its own XP or gold.
- `npm run build` — production build succeeds and the 3D code is in its own on-demand chunk.

Later phases get their own checks in `docs/phases/phase-N.md`.

## After approval

I create `C:\dev\eduventure`, do Phase 0, write the detailed Phase 1 task list, and start building Phase 1. Your part at that point: create the Supabase project and paste the two keys.
