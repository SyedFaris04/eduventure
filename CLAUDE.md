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
- `npm run gen:questions` / `npm run gen:lessons` — turn edited `content/questions` or `content/courses` files into migrations (the tests check, and run, the content first)
- After adding questions with a KSSR/KSSM alignment, run `node scripts/tag-curriculum.mjs` (adds the curriculum tag), then `npm run gen:questions`.
