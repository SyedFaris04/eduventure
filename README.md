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
