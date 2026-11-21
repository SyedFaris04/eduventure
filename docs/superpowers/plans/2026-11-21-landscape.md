# Landscape and phone fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The game is locked to landscape in the Android app, asks phone browsers to turn sideways, and fits a 360 px tall screen without scrolling inside the world.

**Architecture:**
- The orientation helpers live in `src/app/orientation.ts`, and `<RotatePrompt/>` is mounted in `App`.
- The Android manifest locks landscape.
- Compact layouts use the existing `short:` variant.
- A Playwright fit test (`tests/e2e/landscape.spec.ts`, project `online`) measures every world panel and the main pages at 740×360.

**Tech Stack:** React, Tailwind 4 (`short` custom variant), the Screen Orientation and Fullscreen APIs, Capacitor Android manifest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-landscape-design.md`

## Global Constraints

- **Compact rules use `short:` only:** tablet and laptop layouts must not change. Check this with the device-shots tool at laptop size.
- **Size floors:** text 12 px or larger, tap targets 40 px or larger.
- **Locking orientation never throws** and never blocks the game; when a lock is refused, the rotate screen covers that case.

## Review Focus

- **iPhone Safari, held upright:** the rotate screen shows. Covered by the `needsRotate` unit test.
- **A tablet held upright:** no rotate screen (its short side is 600 px or more). Unit test.
- **The keyboard on a sideways phone** (sign-in): the form's button stays reachable. The page scrolls; this is an accepted limit.
- **A battle question with long answers** fits, using the longest answers in the starter bank. The fit test uses a real question.
- **Laptop layout unchanged:** compare device shots before and after.

---

### Task 1: Orientation

**Files:** create `src/app/orientation.ts` and `.test.ts`, and `src/app/RotatePrompt.tsx`. Modify `src/app/App.tsx` (mount it), `src/features/loading/LoadingScreen.tsx` (call `lockLandscape()` on Tap to start), `android/app/src/main/AndroidManifest.xml` (`android:screenOrientation="sensorLandscape"`), and the i18n files (`rotate.title`, `rotate.body`, in 7 languages).

- [ ] **Step 1:** Write the failing tests:
  - `needsRotate({ width: 390, height: 844, coarse: true })` is true.
  - `needsRotate({ width: 844, height: 390, coarse: true })` is false.
  - `needsRotate({ width: 768, height: 1024, coarse: true })` is false (tablet).
  - `needsRotate({ width: 390, height: 844, coarse: false })` is false (a desktop browser made narrow).
  - `lockLandscape` resolves even when `requestFullscreen` and `screen.orientation.lock` reject or are missing.
- [ ] **Step 2:** Run `npx vitest run src/app/orientation.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. `RotatePrompt` listens to `resize` and `orientationchange`, and is not shown in the Android app (the activity is locked there).
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Commit.

### Task 2: World panels fit sideways

**Files:** create `tests/e2e/landscape.spec.ts` (add it to the `online` project). Modify the world panels: `BattlePanel`, `BossPanel`, `HarvestPanel`, `CraftPanel`, `BoardPanel`, `WorldSettings`, `JettyPanel`, `DialogueBox`, `PlayerCard`, and the HUD in `WorldPage`, `TouchControls` and `Minimap`.

- [ ] **Step 1:** Write the fit test:
  - New guest; enter the world at 740×360 with `hasTouch`.
  - Open each panel through the `__game` store: a battle with a real monster id, a boss, a harvest at a real node, `workbench`, `board`, settings by its button, `jetty`, and a dialogue with the elder.
  - For each panel, assert its `role=dialog` box lies inside the viewport, and `scrollHeight <= clientHeight + 1` for the dialog and the page.
  - Assert the HUD, the joystick and the action button don't overlap: their bounding boxes are pairwise disjoint.
- [ ] **Step 2:** Run it. Expected: FAIL; list every panel that fails.
- [ ] **Step 3:** Add `short:` layouts until it passes:
  - battle and boss: two columns, a smaller monster area, two-column answers;
  - others: `max-h-[100dvh]` with an internal scrolling list where the content is a list.
- [ ] **Step 4:** Run the fit test, `npm test`, and the world end-to-end test. Expected: PASS. Commit.

### Task 3: Pages fit sideways

**Files:** extend `tests/e2e/landscape.spec.ts` with pages. Modify the home, shop, pet, library, academy and hall, sign-in, sign-up and onboarding pages as needed.

- [ ] **Step 1:** Extend the test. At 740×360, each page's main action is in the viewport without scrolling:
  - Home: "Enter the World";
  - Onboarding: "Next";
  - Login: "Log in";
  - Shop: the first item's "Buy";
  - Pet: its main button;
  - Academy and Hall: the first course card.
- [ ] **Step 2:** Run it. Expected: FAIL for some pages.
- [ ] **Step 3:** Add `short:` layouts: side-by-side hero and actions on home, a compact header, and the onboarding options list in a row.
- [ ] **Step 4:** Run it. Expected: PASS. Then `npm test` and the device shots at laptop size (unchanged). Commit.

### Task 4: Screenshots and docs

- [ ] **Step 1:** Screenshots at 740×360, 800×360 and 915×412 of the world, battle, home and shop, for the owner.
- [ ] **Step 2:** Docs: decision #46, README (the landscape note), and CLAUDE.md ("phones are landscape-only; check `short:` layouts with `tests/e2e/landscape.spec.ts`"). Run `npm test` and `npm run build`. Commit.
