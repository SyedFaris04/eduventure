# Landscape and phone fit — design

Date: 2026-11-21. Status: approved by the owner ("proceed"). First of four projects the owner ordered: landscape, slash harvesting, own island, cuter sound.

## Intent

On phones the game sometimes needs scrolling, and the owner wants it always in landscape. The goal is a game that fits a sideways phone, with no scrolling inside the world, so later projects (like the island editor) are designed sideways from the start.

## Goals

- **Always sideways:**
  - **Android app:** locked to landscape (`screenOrientation="sensorLandscape"`).
  - **Phone browsers:** "Tap to start" also asks for full screen plus a landscape lock (Screen Orientation API). Where that's refused, for example on iPhones, a phone held upright shows a "Turn your phone sideways" screen. A phone means a coarse pointer and a short side under 600 CSS px.
  - **Tablets and laptops:** unchanged.
- **Fits a 360 px tall screen with no page scrolling inside the world.** This covers the top bar, touch controls, the battle, a boss fight, harvesting, the workbench, the camp board, settings, the boat (jetty), dialogue and the player card.
  - Battle and boss panels go side by side: monster and health bars on the left, question and answers on the right.
  - Other panels use the full height in two columns where needed.
  - Only genuinely long lists scroll inside their own area: the shop and recipes, missions, board notes, the settings sliders.
- **Pages** (home, shop, pet, library, academy and hall, sign-in, sign-up, the learning-profile steps) get compact sideways layouts. Their main button is on screen without scrolling; long content can still scroll.
- **Proof:** a Playwright test at 740×360 (touch) opens each world panel. It fails if the panel spills off the screen or the panel itself needs scrolling, and it checks each page's main button is in view. There are also screenshots at 740×360, 800×360 and 915×412.

## Non-goals

- Portrait layouts for phones.
- Redesigning the panels' content.
- New features.

## Anti-goals

- Shrinking text below about 12 px, or tap targets below 40 px.
- Breaking tablet or laptop layouts. The compact rules apply only to the `short` variant (landscape and max-height 500 px), which already exists in `src/styles/index.css`.

## Approach

Use the existing `short:` Tailwind variant for compact sideways layouts, one panel at a time, measured by the fit test. Scaling the whole interface down instead was rejected: it makes text too small on 360 px tall phones. The orientation helpers are pure functions with unit tests: `needsRotate({ width, height, coarse })`, and `lockLandscape()`, which tries full screen and then the lock and never throws.

## Left to the builder

The exact compact arrangement of each panel, and the rotate screen's artwork (a phone drawn in CSS, turning).
