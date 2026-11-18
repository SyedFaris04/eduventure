# Camera settings — design (small change)

Date: 18 Nov 2026. Owner: "the current camera is too high, I can't see my character's face clearly; make the camera
adjustable to the player's preference" (and "just proceed").

**What we found.** The world camera is fixed at a 52° tilt, 22 units away, field of view 30°, aimed at the hero's feet,
always looking along the same diagonal; only zoom (wheel/pinch, 13–32) changes. MMO-style cameras usually sit around
25–35° (55° reads as nearly top-down — [community camera config](https://pub.claap.fr/threads/cameraconfig.258/));
Animal Crossing: New Horizons defaults to a lower, closer camera and offers the overhead view as a switch
([Destructoid](https://www.destructoid.com/?p=256555)); accessibility guidelines ask for adjustable view settings, a
sensible default, and a reset, since no single setting suits everyone
([Xbox Accessibility Guideline 117](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117),
[Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/if-the-game-uses-field-of-view-3d-engine-only-set-an-appropriate-default-for-the-expected-viewing-environment/)).

**Goals.**
- A ⚙️ **Settings** button in the world (replacing the graphics toggle) opens a panel with: Graphics (Auto/High/Low),
  four camera **presets** — Close (32°, 14), Balanced (40°, 18, the new default), Classic (52°, 22, today's view),
  Overhead (65°, 27) — and fine controls: **Tilt** 25–70°, **Zoom** 13–32, **Field of view** 25–50°, **Rotate** left/right
  in 90° steps, and **Reset**.
- The camera aims higher on the hero when the tilt is low (from feet at 70° to chest height at 25°), so faces read.
- Keyboard and joystick "up" always means "away from the camera", whatever the rotation.
- Settings are saved on this device (a phone and a PC can differ); wheel/pinch zoom saves too.
- Reduced motion keeps its instant camera follow.

**Non-goals.** Free mouse-drag orbiting, first-person, fading trees/walls that hide the hero (later, if the Close
preset proves to need it), syncing settings across devices.

**Approach.** Pure helpers in `projection.ts` (`cameraOffset(distance, tiltDeg, yaw)`, `lookHeight(tiltDeg)`,
`PRESETS`), a small zustand store saved to localStorage (like the graphics choice), `screenDirToGrid(d, yaw)` with the
current diagonal as default, and the sim reading the camera yaw. Alternative considered: free orbit by dragging —
rejected because drag already means "walk here" on phones.
