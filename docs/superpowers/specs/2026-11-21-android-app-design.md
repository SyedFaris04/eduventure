# Android app and device pass — design

Date: 2026-11-21. Status: approved by the owner ("proceed").

## Intent

The owner wants people to download the game as an Android app (APK) from the website they share, built in the cloud for free. The game must also work well on every phone, tablet and laptop. The website itself is the next project; this one makes the APK and the hosted game it opens.

## Goals

- **Hosted game:** every push to `main` publishes the game to GitHub Pages at `https://syedfaris04.github.io/eduventure/play/`. The site root `/eduventure/` is left for the website project, which lives in this repository and is published by the same workflow (a Pages deploy replaces the whole site). Until then the root is a small page with "Play in your browser" and "Download the Android app" (`site/index.html`), so a shared root link already works.
- **The app loads the game live** from that address (owner's choice), so every fix reaches all players at once and old app versions never break when the database changes.
- **Cloud build:** a GitHub Actions workflow on every push to `main`:
  - runs the unit tests;
  - builds the web game with the production base path;
  - publishes it to Pages;
  - builds a **signed release APK**;
  - attaches it to a GitHub Release, tagged `app-v<versionCode>`, with a stable asset name `eduventure.apk`, so `https://github.com/SyedFaris04/eduventure/releases/latest/download/eduventure.apk` always gives the newest app.
  - It is free: the repository is public.
- **The APK:**
  - A Capacitor Android shell whose `server.url` is the hosted game. The app id is `com.eduventure.app`, and the name is "Eduventure".
  - **Updates:** signed with one release key, so each new APK installs over the old one. `versionCode` is the Actions run number.
  - **Android back button:** closes the open panel (battle excepted, see below), otherwise goes back a page, and on the welcome or home page leaves the app.
  - **Screen:** safe areas, so nothing sits under a notch, rounded corner or gesture bar. Status bar colours match the game. Portrait and landscape are both allowed.
  - **Look:** an app icon and a splash screen drawn from the game's art (the loading artwork's style).
  - **Offline screen:** when the game can't load, a bundled page ("You're offline", with Try again) replaces Android's blank error. It's in English and Malay, because it can't load the translations.
  - Links to other sites (WhatsApp, email) open outside the app.
- **Device pass:**
  - Screenshot every main screen at five sizes:
    - small phone portrait 360×740
    - phone landscape 740×360
    - tablet portrait 768×1024
    - tablet landscape 1024×768
    - laptop 1366×768
  - Main screens: loading, welcome, sign-in, onboarding, creator, home, world (HUD, touch controls), a battle, shop, pet, missions, settings, the camp board, the parent page and a lesson.
  - Fix everything cut off, overlapping, unreachable or too small to tap (below 44 px). Touch controls show on touch devices, including tablets and touch laptops.

## The address is permanent

The owner chose GitHub's address and no custom domain. Every APK has `https://syedfaris04.github.io/eduventure/play/` built in, so the repository must keep its name and Pages must stay on. If a domain is ever added, GitHub redirects the old address to it; installed apps would then open the game in the phone's browser rather than in the app until they update, because Capacitor sends other hosts outside the app. The README records this.

## Non-goals

- Google Play or the iOS App Store: store accounts, policies and listing. The APK is downloaded from the website.
- Push notifications, playing offline, and native features beyond back button, status bar, splash and safe areas.
- The website (next project), and the multiplayer server deploy (waiting on the owner's Cloudflare account).

## Anti-goals

- **A lost or leaked signing key.** The key is made once, never committed, stored as a GitHub secret, and backed up by the owner. Losing it means every player must uninstall before updating.
- **Reporting an APK as working without proof.** "Built" means the workflow produced it. "Works" means it was installed and opened on an Android device or emulator. If neither is available here, the owner's phone test is the proof, and the report says so.
- **Breaking local development.** `npm run dev`, the tests and the end-to-end tests keep running at `/`; the base path applies only to the Pages build.

## Constraints

- **Stack:** React 19, Vite, React Router (`createBrowserRouter`), Supabase. Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app` (back button), `@capacitor/status-bar` and `@capacitor/splash-screen`. The Android project lives in `android/` and is committed.
- **Base path:** Vite `base` comes from the environment (`/eduventure/play/` for Pages, `/` otherwise), and the router's `basename` matches it. Code that assumes the site root must use `import.meta.env.BASE_URL`:
  - asset URLs in `src/audio/engine.ts`, `src/features/loading/hotspots.ts`, `src/world3d/hero/useRig.ts` and `src/world3d/Props.tsx`;
  - the sign-in email links in `src/features/authentication/authActions.ts`;
  - the parent link in `src/features/parents/links.ts`.
- **Deep links on GitHub Pages:** GitHub Pages has no fallback to the app for unknown paths, so the build copies `index.html` to `404.html` inside `/eduventure/play/`. The router handles the path; the 404 status is harmless.
- **Secrets:** `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are GitHub Actions secrets. The key alias and key password are fixed in the workflow, the key password being the same as the keystore password. `VITE_ROOMS_URL` is optional and read when present.
- **Toolchain in CI:** JDK 21 and the Android SDK, from the `ubuntu-latest` image. Gradle builds `assembleRelease`.
- **Never commit:** the keystore, `.env.local`, `.env.test.local` or any token. Add `*.jks` and `*.keystore` to `.gitignore`.

## Approaches considered

- **Packed APK vs live:** the owner chose live loading (above).
- **Hosting:**
  - **GitHub Pages (chosen):** no new account, and the same workflow does everything.
  - **Vercel:** cleaner addresses, but needs a linked account, and its free plan is personal and non-commercial.
  - **Cloudflare Pages:** needs the Cloudflare account that doesn't exist yet.

## Design notes

- **Back button:**
  - One handler (`src/app/backButton.ts`) is registered only when `Capacitor.isNativePlatform()`.
  - It closes, in order: the open game-store panels (settings, board, workbench, harvest, jetty, dialogue, player card). A battle or boss fight is left alone, so a back press can't skip a question.
  - Otherwise it calls `history.back()`. On `/welcome` and `/home` it calls `App.exitApp()`.
- **Safe areas:** CSS `env(safe-area-inset-*)` padding on the HUD and fixed bars; `viewport-fit=cover` is already set.
- **Offline page:** Capacitor's `server.errorPath` points to a bundled `offline.html` with a Try again button, which reloads the hosted address.
- **Supabase:** the owner adds `https://syedfaris04.github.io/eduventure/play/**` to the allowed redirect URLs in the Supabase dashboard (Authentication → URL Configuration). The email-link fix makes verification and reset links go back to the hosted game.

## Testing

- **Unit:**
  - the back-button handler (each panel closed in order, battle untouched, exit on home);
  - `withBase` / asset URL helpers under a non-root base;
  - the parent link under a base path.
- **Build check:** `BASE_PATH=/eduventure/play/ npm run build`, then serve `dist/` under that path with `vite preview --base`. Playwright opens the welcome page, a deep link (`/eduventure/play/home`) and the 3D world, with assets loading (no 404s in the console).
- **Workflow:**
  - The first run on the owner's repository, after the secrets are set, must publish Pages and attach `eduventure.apk`.
  - Check locally what can be checked: `npx cap sync android`, and a Gradle `assembleDebug` if the Android SDK can be installed on this PC; otherwise the CI run is the build proof.
- **Device pass:** before and after screenshots for each size, kept in the scratchpad; fixes get unit tests where they change logic.

## Left to the builder

- Icon and splash artwork details, and the exact offline page wording.
- Whether the release also keeps older APKs; only `latest` matters.
- The order of panels for the back button beyond the rule above.

## Owner steps (written in the README when done)

1. **Signing key:** keep the backup I hand over somewhere safe, outside the repository and OneDrive sync if possible.
2. **GitHub → Settings → Secrets and variables → Actions:** add the four secrets.
3. **GitHub → Settings → Pages:** set "Source" to "GitHub Actions".
4. **Supabase → Authentication → URL Configuration:** add the redirect address.
5. **Test:** on an Android phone, open the release download link, allow "Install unknown apps" for the browser, install, open and play.
