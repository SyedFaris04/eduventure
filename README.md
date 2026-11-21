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

## Website

**https://syedfaris04.github.io/eduventure/** is the page to share: what the game is, the 3D island, a demo battle,
the knowledge pet, the islands, safety for children, and the Android download (button, install steps and a QR code).
English and Malay. It lives in `site/` (all its words are in `site/copy.ts`), reuses the game's 3D models, and is
published with the game by the same workflow. `npm run dev:site` runs it locally; `npm run build:site` builds it.

## Android app and hosting

Every push to `main` runs `.github/workflows/release.yml`: the tests, then the game is published to GitHub Pages at
**https://syedfaris04.github.io/eduventure/play/** (the website is at the site root), then a
signed Android app is built and attached to a GitHub Release. The newest app is always at
**https://github.com/SyedFaris04/eduventure/releases/latest/download/eduventure.apk**.

The app opens the hosted game, so game updates reach every player without a new APK. It always plays sideways (landscape); in a phone browser the game asks for landscape on "Tap to start". That address is built into every
installed app: keep the repository's name and GitHub Pages on. (If you ever add your own domain, installed apps will
open the game in the phone's browser until they install a new APK.)

One-time setup (the owner):
1. **Keep the signing key safe.** The release key (`eduventure-release.jks`) and `android-secrets.txt` were made once
   and are not in the repository. Back up both somewhere private (a password manager or a USB drive), not in OneDrive
   alongside the code. If the key is lost, every player must uninstall the app before they can install a new one.
2. **GitHub → Settings → Secrets and variables → Actions → Secrets tab → New repository secret**, twice:
   `ANDROID_KEYSTORE_BASE64` and `ANDROID_KEYSTORE_PASSWORD`, copied from `android-secrets.txt`. (The Supabase address
   and publishable key are public and written in the workflow; once multiplayer is deployed, add `VITE_ROOMS_URL` as a
   variable.)
3. **GitHub → Settings → Pages → Build and deployment → Source: GitHub Actions.**
4. **Supabase → Authentication → URL Configuration:** add `https://syedfaris04.github.io/eduventure/play/**` to the
   Redirect URLs (so verification and password-reset emails open the hosted game).
5. **GitHub → Actions → Release → Run workflow** (or push to `main`) and wait for the three jobs to turn green.
6. **On an Android phone:** open the APK link, allow your browser to "install unknown apps", install, open and play.

Local commands: `npm run build:pages` builds the Pages site into `pages/`, `npm run check:pages` checks it in a browser
(download page, deep links, assets). `npx cap sync android` updates the Android project after changing
`capacitor.config.json` or a Capacitor plugin; `python scripts/gen-app-icons.py` redraws the icon and splash screen.
`DEVICE_SHOTS=<folder> npx playwright test device-shots --project devices` screenshots every main screen at phone,
tablet and laptop sizes.

