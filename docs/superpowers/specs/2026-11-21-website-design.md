# Website — design

Date: 2026-11-21. Status: approved by the owner ("proceed").

## Intent

The owner wants a website to share with people. It briefly shows what Eduventure is, feels interactive with 3D and visuals, and has a download section for the Android app (APK). It is built in code and hosted for free, and replaces the plain download page at `https://syedfaris04.github.io/eduventure/`. The game stays at `/eduventure/play/`.

## Goals

- **One page, top to bottom:**
  1. **Header:**
     - "EDUVENTURE" and an English/Malay switch;
     - "Play now", which goes to `play/`.
  2. **Hero:**
     - **3D scene:** the game's floating-island scene (`HeroScene`), slowly turning; drag or swipe to spin it.
     - **Text:** the tagline.
     - **Buttons:** **Download for Android** (the release APK URL) and **Play in your browser**.
  3. **How it works:** three cards that flip on tap or hover to give more detail:
     - Explore islands;
     - Battle with questions;
     - Grow your knowledge pet.
  4. **Try a question:** a live demo using one of 3 built-in questions.
     - A 3D monster (the game's `sproutling`) is shown with a health bar.
     - A right answer hits it, with a shake and the bar dropping.
     - A wrong answer shows the "why" explanation.
     - After the third question, a "Play the real thing" call to action.
     - The questions are stored in the site; there's no server and no account.
  5. **Meet your pet:** the game's 3D pet. Tapping "Evolve" steps it through its stages.
  6. **The islands:** five cards: Greenhaven, Science, Mathematics, Technology, Language. Each shows a colour, an icon and a one-line description.
  7. **Safe for kids:**
     - parent approval for under-18s;
     - under-13s use stickers and phrases only, and see no strangers' typed text;
     - filtered camp boards with reports;
     - no ads and no loot boxes.
  8. **Download:**
     - a big APK button;
     - four illustrated install steps (download, tap the file, allow this source once, install);
     - a QR code that opens the APK link, for people viewing on a laptop;
     - a note that iPhone players use "Play in your browser".
  9. **Footer:** play link and download link.
- **English and Malay**, switchable. The choice is remembered, and the default is English unless the browser prefers Malay.
- **Works and loads fast on phones, tablets and laptops.** The text and buttons show first. The 3D code loads afterwards, on its own, only for sections that scroll into view.
- **Still pictures instead of 3D** when the browser prefers reduced motion, when WebGL is unavailable, or on low-end devices (the game's existing quality check).

## Calls from the builder check (mine)

- **When 3D shows:** the browser has WebGL (`hasWebGL()` in `src/world3d/webgl.ts`) and doesn't prefer reduced motion. The welcome page's "4 cores or fewer" rule is **not** used: it would hide the 3D from many phones, against "interactive with 3D". Each 3D section loads only when it scrolls near the screen (IntersectionObserver), and its canvas stops drawing while off-screen (`frameloop` set to `never`), so a slow phone only ever draws one small scene at a time.
- **Still pictures:**
  - the hero section uses the loading artwork (a copy in `site/public/`);
  - the monster and the pet use simple shapes drawn in code: a green slime, and a pet circle that grows per stage.
  - "Hit" and "Evolve" animate these with CSS when there's no 3D.
- **Shared game code:** `HeroScene` gains optional props (`spin`, which turns slowly and lets the player drag to rotate with drei `OrbitControls`, no zoom or pan). The defaults leave the game's welcome page exactly as it is. The game's tests and `check-pages` run again.

## Non-goals

- More pages, a blog, a sign-up form, analytics, a contact form, or the 5 other languages.
- iOS app download (there is no iOS app).
- Changing the game.

## Anti-goals

- **A heavy first load:** the page shows text and buttons before any 3D.
- **Fake numbers:** no made-up player counts, ratings or reviews.
- **Imitating a real brand:** none.
- **A broken download link:** the button always uses `…/releases/latest/download/eduventure.apk`.

## Constraints

- **Built in this repository** as a second Vite entry, `vite.site.config.ts`: root `site/`, `base: '/eduventure/'`, output `dist-site/`.
  - It imports the game's 3D code from `src/`: `HeroScene`, `buildMonster`, the pet builder, `quality`, and the colour tokens and fonts in `src/styles`.
  - It does **not** import the game's i18next, Supabase or router. The site has its own small EN/BM dictionary.
- **Pages bundle:** `scripts/pages-bundle.mjs` copies `dist-site/` to `pages/`, replacing `site/index.html`. The game stays in `play/`, and the 404 fallback stays the game for `/eduventure/play/*` (decision #44).
  - A path outside the game now goes to the website root.
  - `npm run build:pages` builds both; the workflow already runs it.
- **QR code:** a static SVG generated once by `scripts/gen-qr.mjs` with the `qrcode` npm package as a pinned dev dependency, then committed. The URL is fixed, so it never needs regenerating.
- **No new runtime dependencies.** React, R3F, drei, three and Tailwind are already installed.

## Approaches considered

- **A separate Vite page reusing the game's 3D code (chosen):** the site shows the real game models with no redrawing.
- **Plain HTML plus hand-written three.js:** lighter, but it duplicates every model.
- **A website builder:** it can't use the game's models, and it means another account.

## Testing

- **Unit:**
  - the EN/BM dictionary has the same keys in both;
  - the demo quiz logic (right lowers the monster's health, wrong shows why, the end comes after 3);
  - every link points to `play/` or the release APK URL.
- **`check-pages.mjs`:**
  - the root shows the hero heading and both buttons;
  - the language switch changes the heading to Malay;
  - the quiz answers once;
  - the QR image loads;
  - `/eduventure/play/` still starts the game;
  - an unknown path outside the game goes back to the website root.
- **Screenshots** at the device-pass sizes (phone, phone landscape, tablet, laptop): everything reachable, and nothing cut off.

## Left to the builder

The exact wording (warm and short, for students and parents), the card icons, the colours of each island card, the three demo questions (simple, primary to secondary level, with explanations), and the install-step pictures (drawn in code as simple phone mock-ups).
