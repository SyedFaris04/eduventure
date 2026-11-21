# Phone fit: every screen fits a phone held sideways

**Why:** most players will use phones (the game plays sideways on them, decision #46). The world already fits, but the
loading/welcome/onboarding/creator/Home/shop pages were built for tall screens. They stack top-to-bottom, so on a
740 × 360 phone Home is 4.5 screens tall and the shop 5.5. The in-game hero card (320 × 84), minimap (174 × 94) and
joystick (128) also cover too much of a 360 px-tall screen. The owner wants every screen to fit without scrolling,
using pages (1, 2, 3) where there's too much, with smaller sizes overall. Home becomes a game lobby (owner's choice, A).
The owner handed the remaining decisions over ("proceed with what you think is best").

## Goals
- On short screens (the existing `short` variant: landscape and ≤ 500 px tall), no screen in the player's path scrolls
  the page, and nothing spills sideways. Design floor is **640 × 300**, a phone in Chrome with the address bar showing,
  as well as 740 × 360 and larger.
- Long lists page instead of scroll: a shared pager (‹ 1 2 3 › arrows, dots, swipe).
- Home on short screens is a lobby:
  - a top bar with the hero, level, XP and gold;
  - icon menu tiles (Library, Shop, Pet, Academy, Hall, plus Teacher and Admin when allowed);
  - the hero in the middle;
  - a big Enter the World button;
  - tiles that open panels: Missions, Learning profile, My classes, Save progress (guests), and the pet adventure and parent cards when present.
- In-game HUD on short screens:
  - a slim hero card about 40 px tall (avatar, name, level, XP bar, gold);
  - a minimap of about 120 × 66 that still opens big when tapped;
  - a joystick of about 100 px;
  - side buttons of 40 px.
- Tablets, laptops and portrait screens look exactly as today.

## Non-goals
- Parent, teacher and admin pages: they allow portrait and are adult tools.
- Battle, lesson, world panels and the build panel already fit (landscape.spec); they are left alone unless the new test catches them.
- No new features.

## Sizes (from the research)
- **Touch targets:** at least 44 px for primary actions (Apple HIG, 44 pt; Google, 48 dp). Ordinary buttons go to 40 px on short screens, and small secondary controls (map toggle, page arrows) to 32–36 px. Apple's game guidance allows 28 pt for less important controls.
- **Text:** body at 12 px or larger (Android's 12 sp floor). Headings shrink on short screens.
- **Layout:** controls at the left and right edges in landscape (Apple), and few controls at once (Epic: 5–6).

## Approach
`short:` utility classes per screen, a `useShortScreen()` hook where the structure must change (the Home lobby,
paging), and one shared `Paged` component.
- Rejected: one global zoom. It shrinks touch targets and blurs text, and it doesn't fix the stacking.
- Rejected: separate phone pages. Every future change would have to be made twice.

## Per screen (short screens only)
| Screen | Change |
|---|---|
| Welcome | Smaller title and tagline, tighter spacing; login and signup buttons side by side |
| Login and Signup | The back and language column beside the form; signup fields in two columns |
| Explore | Regions paged, 3 at a time, with compact cards |
| Onboarding (and Settings → learning profile) | A side column with the step title, dots and Back/Next; the answers on the right, paged (levels 4, countries 8 with search, grades 6, subjects 12) |
| Creator | Hero on the left and options on the right; one part per page with ‹ Top 1/3 › |
| Home | The lobby above |
| Shop | Hero items paged 4 at a time; the pet corner on its own page |
| Pet, Library, Academy, Hall (lists and course pages) | Compact header; lists paged |
| World | The compact HUD above |

## Verification
A new e2e test (`phone-fit.spec.ts`) visits every screen above at 740 × 360 and 640 × 300 with touch, and fails if:
- the page scrolls, or anything spills off the side;
- a primary button is outside the screen;
- the HUD exceeds its size limits.

Unit tests cover `Paged` and `useShortScreen`.
