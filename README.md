# EDUVENTURE

Learn. Explore. Grow. Conquer.

An educational multiplayer RPG. See `docs/ROADMAP.md` for the full plan.

## Setup

Requires Node.js 22+ and a free Supabase project.

1. Create a project at https://supabase.com/dashboard (free tier is fine). Pick the region closest to you.
2. In the project, open **Project Settings > API** (or the **Connect** button) and copy:
   - the **Project URL**
   - the **publishable key** (`sb_publishable_...`) or, on older projects, the **anon public** key
3. Copy `.env.example` to `.env.local` and paste both values in.
   Never paste the `service_role` / secret key here: anything starting with `VITE_` is sent to the browser.
4. Install and run:

   ```
   npm install
   npm run dev
   ```

5. Open http://localhost:5173. The page says "Supabase connected" when the keys work.
   To test on your phone, open the `Network:` address that `npm run dev` prints (same Wi-Fi).

## Multiplayer (optional)

Players see each other through a small free Cloudflare room server in `server/rooms` (see its README).
Without it the game works exactly as before, solo.

1. Create a free account at cloudflare.com, then an API token from the **Edit Cloudflare Workers** template,
   and put it in `.env.local` as `CLOUDFLARE_API_TOKEN=...` (never commit it).
2. In `server/rooms`: `npm install`, `npx wrangler secret put SUPABASE_PUBLISHABLE_KEY` (paste the publishable key), then `npm run deploy`.
3. Add the address it prints to `.env.local` as `VITE_ROOMS_URL=wss://eduventure-rooms.<account>.workers.dev`, and rebuild the web app.

