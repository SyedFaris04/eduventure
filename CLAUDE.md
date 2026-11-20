# EDUVENTURE

Educational multiplayer RPG for primary-school to university learners. Web (React + a 3D world in React Three Fiber) first, Android and iOS via Capacitor later, Supabase backend.

- Roadmap and phase order: `docs/ROADMAP.md`. Current phase task list: `docs/phases/phase-N.md`.
- Architecture decisions: `docs/decisions.md`. Add an entry when a decision is hard to reverse.
- Visual reference: `docs/reference/isometric-style.jpg` (mood only, never ship or copy it). Loading art: `public/assets/loading/eduventure-loading.png` (owner's own artwork).

## Workflow

Each phase: design chat, then build in small slices that each run before the next starts, then tests plus the phase's "done when" list, then a report, then the owner approves before the next phase. A phase is done when its checklist passes.

Branching (owner's standing instruction, 2026-11-16): build each phase on its own branch. When all checks pass with no errors, merge it into `main`, push `main` to GitHub (`origin`) and delete the local phase branch, without asking. If anything fails, do not merge; report instead.

## Standing rules

- XP, gold, items and rankings change only through database functions (`security definer`). The client never writes them; RLS makes those tables read-only to users.
- No fake players, fake chat or fake leaderboard rows. Show empty states instead.
- Every visible button works or is labelled as planned.
- A question is published only after a person approves it. Every question has a source, licence and learning objective. Answer keys are never readable by the client before answering.
- Age-band rules (under 13 / 13-17 / 18+) are enforced on the server, not only in the UI.
- No secret keys in the frontend. Only the Supabase publishable/anon key goes in `VITE_` vars. `.env.local` is never committed.
- Every database change is a migration file in `supabase/migrations/`.
- Nothing is reported as working (external service, APK, test) unless it was actually run.
- Add dependencies only when a phase first needs them.

## Commands

- `npm run dev` — dev server, also reachable from a phone on the same Wi-Fi
- `npm run build` — type-check (TypeScript 7) and production build
- Multiplayer room server (`server/rooms`, Cloudflare): `npm run dev --prefix server/rooms` serves ws://localhost:8787 (needs `server/rooms/.dev.vars` with `SUPABASE_PUBLISHABLE_KEY`); `node server/rooms/smoke.mjs` checks it; `npm run test:e2e:mp` runs the two-player test. The app connects only when `VITE_ROOMS_URL` is set. Deploy: `npm run deploy --prefix server/rooms` with `CLOUDFLARE_API_TOKEN`.
- `npm run gen:questions` / `npm run gen:lessons` — turn edited `content/questions` or `content/courses` files into migrations (the tests check, and run, the content first)
- After moving or adding harvest nodes (`t`, `o`, `c`, `v`) in a map, run `python scripts/gen-nodes.py`: it writes a migration listing every node, so the server only lets players harvest real ones.
- Festival dates live in the `festivals` table (Malaysia time). Confirm provisional dates and add next year's festivals as new rows (a migration, or the owner in the Supabase table editor). Check a festival before it starts with the admin preview in `/admin`, or `/dev/world?festival=cny` for the decorations.
- After editing `content/blocked-words.txt` (words a typed character name or camp-board note may not contain), run `python scripts/gen-blocked-words.py` (it writes a new, later migration each time) and push it, then `npx supabase db query --remote --yes -f tests/sql/names-ok.sql` and `-f tests/sql/text-ok.sql` must both report `wrong: 0`. Prefix short words with `=` (whole word only) so names like Nazim or Wan Kamal still pass.
- After adding questions with a KSSR/KSSM alignment, run `node scripts/tag-curriculum.mjs` (adds the curriculum tag), then `npm run gen:questions`.
