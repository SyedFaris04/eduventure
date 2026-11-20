# Android app and device pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the game to GitHub Pages at `/eduventure/play/` and build a signed Capacitor APK, which loads that address, in GitHub Actions on every push to `main`. Then make every main screen work at phone, tablet and laptop sizes.

**Architecture:** Vite builds with `base` taken from `BASE_PATH` (Pages only), and the router's `basename` follows it. `scripts/pages-bundle.mjs` lays out the Pages site: a root download page, the game in `play/`, and a `404.html` fallback. A Capacitor 8 Android project (`android/`) has `server.url` set to the hosted game, plus a bundled offline page. One workflow tests, deploys Pages, builds the release APK with the keystore from secrets, and attaches it to a GitHub Release.

**Tech Stack:** Vite, React Router, Capacitor 8 (`@capacitor/core`, `cli`, `android`, `app`, `status-bar`, `splash-screen`), GitHub Actions (`actions/upload-pages-artifact`, `actions/deploy-pages`, `gh release`), Python PIL (icons), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-android-app-design.md`

## Global Constraints

- **Addresses:**
  - The game: `https://syedfaris04.github.io/eduventure/play/`, which is permanent and built into every APK.
  - The APK download: `https://github.com/SyedFaris04/eduventure/releases/latest/download/eduventure.apk`.
- **The app:** app id `com.eduventure.app`, name "Eduventure". `versionCode` is the GitHub run number.
- **Local work is unchanged:** `npm run dev`, `npm test` and the end-to-end tests run at base `/`. Only `BASE_PATH=/eduventure/play/` builds change paths.
- **Secrets:** `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_ROOMS_URL` if present. The key alias is `eduventure`, and the key password is the same as the keystore password.
- **Never commit:** a keystore, `.env*.local` or a token. Add `*.jks`, `*.keystore` and `android/keystore.properties` to `.gitignore`.
- **Proof:** an APK is "built" only when CI produced it, and "works" only when it was opened on a device. The owner's phone test is that proof.
- **Pin versions:** every new dependency and every Action gets an exact version.

## Review Focus

- **A deep link** (`/eduventure/play/home`, a verification email link, a parent link) opened cold on Pages must reach the right page, not a blank one or a GitHub 404. Covered by `scripts/check-pages.mjs`.
- **Absolute paths** that break under the base path: `fetch('/assets/...')`, `new Audio('/...')`, model URLs, `window.location.assign('/')`. Covered by the grep in Task 1 and the console-404 check.
- **The back button during a battle** must not skip or close the question. Covered by `backButton.test.ts`.
- **A failed or partial workflow** must not publish a broken release: the Release step runs only after a successful APK build, and the tests gate both. Checked by reading the workflow and on the first owner run.
- **Notches and gesture bars** must not cover the HUD or the touch controls. Covered by the safe-area CSS and the device-pass screenshots.

---

### Task 1: Base path and the Pages bundle

**Files:**
- Create: `src/app/base.ts`, `src/app/base.test.ts`, `scripts/pages-bundle.mjs`, `site/index.html`, `scripts/check-pages.mjs`
- Modify: `vite.config.ts` (`base: process.env.BASE_PATH ?? '/'`), `src/app/App.tsx` (`createBrowserRouter(routes, { basename })`), `src/audio/engine.ts`, `src/features/loading/hotspots.ts`, `src/world3d/hero/useRig.ts`, `src/world3d/Props.tsx`, `src/features/authentication/authActions.ts`, `src/features/parents/links.ts`, `src/features/landing/WelcomePage.tsx:77`, `package.json` (scripts `build:pages`, `check:pages`)

**Interfaces:**
- Produces:
  - `withBase(path: string, base = import.meta.env.BASE_URL): string`: joins without a doubled slash; `withBase('/assets/x', '/eduventure/play/')` gives `'/eduventure/play/assets/x'`.
  - `appUrl(path: string, origin = location.origin, base = import.meta.env.BASE_URL): string`: the absolute URL used in emails and the parent link.
  - `routerBasename(base = import.meta.env.BASE_URL)`: gives `'/eduventure/play'`, or `'/'` at the root.
- [ ] **Step 1:** Write `base.test.ts`:
  - `withBase` at the root and under `/eduventure/play/`;
  - `appUrl('/login?verified=1', 'https://syedfaris04.github.io', '/eduventure/play/')` gives `'https://syedfaris04.github.io/eduventure/play/login?verified=1'`;
  - `routerBasename` for both bases.
  - Extend `links.test.ts` (or create it): `parentLink('AB12-CD34', origin, '/eduventure/play/')` includes `/eduventure/play/parent?code=`.
- [ ] **Step 2:** Run `npx vitest run src/app/base.test.ts src/features/parents`. Expected: FAIL.
- [ ] **Step 3:** Implement, and replace every root-absolute path listed above. Run `grep -rnE "['\"\`]/(assets|models|audio)/|location\.(assign|href|replace)\(?\s*['\"\`]/" src --include=*.ts --include=*.tsx | grep -v test`. Expected: no lines.
- [ ] **Step 4:** Write `scripts/pages-bundle.mjs`, which takes `dist/` and writes `pages/` as follows:
  - `pages/index.html` comes from `site/index.html`: a simple page in the game's colours with "Play in your browser" (→ `play/`) and "Download the Android app" (→ the release URL), in English and Malay.
  - `pages/play/` is `dist/`.
  - `pages/play/404.html` is a copy of `dist/index.html`.
  - `pages/404.html` redirects anything under `/eduventure/play/` to the game with the same path; anything else goes to `/eduventure/`.
  - Add scripts: `"build:pages": "cross-env BASE_PATH=/eduventure/play/ npm run build && node scripts/pages-bundle.mjs"`. Use `node -e` to set the env if `cross-env` isn't installed; don't add a dependency for it.
- [ ] **Step 5:** Write `scripts/check-pages.mjs`. It serves `pages/` under `/eduventure/` with a tiny Node static server that returns `404.html` for missing files, as Pages does. With Playwright Chromium it opens:
  - `/eduventure/`, which shows both buttons;
  - `/eduventure/play/`, which reaches the welcome page;
  - `/eduventure/play/explore` cold, which shows the Explore page;
  - `/eduventure/play/dev-missing`, which shows the game's Not Found page, not a GitHub page.

  It fails on any console 404 for `/assets/`.
- [ ] **Step 6:** Run `npm run build:pages && node scripts/check-pages.mjs`. Expected: "pages ok". Then `npm test`. Expected: all pass.
- [ ] **Step 7:** Commit: `feat(app): build the game for GitHub Pages under /eduventure/play/`.

### Task 2: Back button, safe areas and status bar

**Files:**
- Create: `src/app/backButton.ts`, `src/app/backButton.test.ts`, `src/app/native.ts`
- Modify: `src/main.tsx` (call `startNative()` when `Capacitor.isNativePlatform()`), `src/index.css` (safe-area utilities), the HUD, touch controls and fixed bars that sit at screen edges (`src/features/world/*`), `package.json` (Capacitor packages)

**Interfaces:**
- Produces:
  - `backAction(s: Pick<GameState, 'battle'|'boss'|'settings'|'board'|'workbench'|'harvest'|'jetty'|'dialogue'|'playerCard'>, path: string): { close: keyof GameState } | 'ignore' | 'exit' | 'back'`.
  - `startNative(router)`, which registers `App.addListener('backButton', …)` and sets the status-bar style and colour (`#5a3d30`, light text). It hides the splash once the app has drawn.
- [ ] **Step 1:** Write `backButton.test.ts`:
  - during a battle or boss fight → `'ignore'`;
  - with settings and board both open → closes `settings` first. The order is `playerCard`, `settings`, `board`, `workbench`, `harvest`, `jetty`, `dialogue`.
  - nothing open on `/world` → `'back'`;
  - nothing open on `/home` or `/welcome` → `'exit'`.
- [ ] **Step 2:** Run `npx vitest run src/app/backButton.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Run `npm install --save-exact @capacitor/core@8.6.2 @capacitor/app@8.1.2 @capacitor/status-bar@8.0.4 @capacitor/splash-screen@8.0.2` and `npm install --save-exact -D @capacitor/cli@8.6.2 @capacitor/android@8.6.2`. Implement the handler, `startNative` and the safe-area padding: `padding-top: env(safe-area-inset-top)` on top bars, `bottom` inset on the touch controls and bottom bars, and left and right insets in landscape.
- [ ] **Step 4:** Run `npx vitest run src/app` and `npm test`. Expected: PASS. Commit: `feat(app): Android back button, safe areas and status bar`.

### Task 3: The Capacitor Android project

**Files:**
- Create: `capacitor.config.ts`, `android-shell/index.html` (redirects to the hosted game), `android-shell/offline.html`, `android/` (from `npx cap add android`), `scripts/gen-app-icons.py`
- Modify: `android/app/build.gradle` (signing from env, `versionCode` from `VERSION_CODE`), `.gitignore`

**Interfaces:**
- Produces: `capacitor.config.ts` with `appId: 'com.eduventure.app'`, `appName: 'Eduventure'`, `webDir: 'android-shell'`, `server: { url: 'https://syedfaris04.github.io/eduventure/play/', errorPath: 'offline.html', androidScheme: 'https' }`, and `plugins.SplashScreen` (background `#8ed1ff`, `launchAutoHide: false`).
- [ ] **Step 1:** Write `scripts/gen-app-icons.py` (PIL). It draws the launcher icon (adaptive foreground and background), a round icon and the splash, from a crop of `public/assets/loading/eduventure-loading.png`, into every `android/app/src/main/res/mipmap-*` and `drawable*` size.
- [ ] **Step 2:** Run `npx cap add android`, then `python scripts/gen-app-icons.py`, then `npx cap sync android`. Expected: `android/` exists; the sync reports the plugins app, status-bar and splash-screen.
- [ ] **Step 3:** Set up signing. `build.gradle` reads `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD` and `VERSION_CODE` from the environment. Release builds are signed only when the keystore path is set; local debug builds are unaffected.
- [ ] **Step 4:** Generate the release keystore outside the repository with `keytool -genkeypair -v -keystore <scratchpad>/eduventure-release.jks -alias eduventure -keyalg RSA -keysize 2048 -validity 10000 -storepass <random 24 chars> -keypass <same> -dname "CN=Eduventure, O=Eduventure, C=MY"`.
  - Write its base64 and the password to `<scratchpad>/android-secrets.txt` for the owner.
  - Never print the password into the conversation; tell the owner the file path.
  - Run `git status --short`. Expected: no keystore or secrets file listed.
- [ ] **Step 5:** Check the build locally if possible. If `ANDROID_HOME` is set or the SDK can be installed, run `cd android && ./gradlew assembleDebug`. Otherwise record a Ruling that CI is the build proof. Run `npm test`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(app): Capacitor Android project that opens the hosted game`.

### Task 4: The GitHub Actions workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `npm run build:pages` (Task 1), `android/` with env signing (Task 3).
- [ ] **Step 1:** Write the workflow:
  - **Trigger:** `push` to `main`, plus `workflow_dispatch`.
  - **Permissions:** `contents: write`, `pages: write`, `id-token: write`.
  - **Concurrency:** group `release`, `cancel-in-progress: false`.
  - **Job `test`:** checkout, `actions/setup-node` (Node 22, npm cache), `npm ci`, `npm test`.
  - **Job `pages`** (needs test):
    - `npm ci`;
    - `npm run build:pages`, with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_ROOMS_URL` from secrets;
    - `node scripts/check-pages.mjs`, after `npx playwright install --with-deps chromium`;
    - `actions/upload-pages-artifact` (path `pages`), then `actions/deploy-pages`, with environment `github-pages`.
  - **Job `android`** (needs test):
    - `npm ci`;
    - `actions/setup-java` (temurin 21);
    - `npx cap sync android`;
    - decode `ANDROID_KEYSTORE_BASE64` to `$RUNNER_TEMP/release.jks`;
    - `./gradlew assembleRelease` with `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD` and `VERSION_CODE=${{ github.run_number }}`;
    - copy the APK to `eduventure.apk`;
    - `gh release create app-v${{ github.run_number }} eduventure.apk --title "Eduventure (build ${{ github.run_number }})" --notes "Install on Android: allow your browser to install unknown apps, then open this file." --latest`, using `GH_TOKEN: ${{ github.token }}`.
    - If the keystore secret is missing, the job fails with a clear message instead of publishing an unsigned APK.
  - Pin every action to a full version tag that exists today (check each on github.com/<owner>/<action>/releases before writing).
- [ ] **Step 2:** Validate the YAML locally: `npx --yes yaml-lint .github/workflows/release.yml` or `python -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))"`. Expected: no error. Read the file once more against the Review Focus line about a failed workflow.
- [ ] **Step 3:** Commit: `ci: publish the game to Pages and build the Android APK on every push`.

### Task 5: Device pass

**Files:**
- Create: `scripts/device-shots.mjs` (development tool, kept)
- Modify: whichever components the screenshots show broken

**Interfaces:**
- Consumes: the dev server on 5173 and `newPlayer`-style onboarding. Use one guest per run and resize the viewport per screen, so the run needs one sign-in.
- [ ] **Step 1:** Write `scripts/device-shots.mjs`. It signs in one new guest (born 2000, named), then visits every screen in the spec at the five sizes and saves `<out>/<screen>-<size>.png`. Touch is emulated (`hasTouch`, `isMobile`) for the phone and tablet sizes.
- [ ] **Step 2:** Run it and look at every image. List each problem: cut off, overlapping, a target under 44 px, unreachable, or touch controls missing or covering the HUD.
- [ ] **Step 3:** Fix each problem. Any fix that changes logic (for example, when touch controls show) gets a failing unit test first. Layout-only CSS fixes are checked by screenshots.
- [ ] **Step 4:** Run the script again; there must be no remaining problems. Run `npm test`, `npm run test:e2e` (online project) and `npm run build`. Expected: PASS. Commit: `fix(ui): phones, tablets and laptops (device pass)`.

### Task 6: Docs and owner steps

**Files:**
- Modify: `README.md` (an "Android app and hosting" section with the owner steps from the spec, the permanent-address note and how to install on a phone), `docs/decisions.md` (#44), `docs/ROADMAP.md` (Phase 7 status), `CLAUDE.md` (commands `build:pages`, `check:pages`, `npx cap sync android`, and where secrets live)
- [ ] **Step 1:** Write the docs, then run `npm test` and `npm run build`. Expected: PASS. Commit: `docs: Android app, Pages hosting and owner steps`.

## Rulings made while planning

- **R1:** No `cross-env` dependency; the script sets `BASE_PATH` with Node. Cost: a slightly longer script line.
- **R2:** The device pass uses one guest and resizes the viewport, because anonymous sign-ins are limited per hour. Cost: no fresh-session check per size.
