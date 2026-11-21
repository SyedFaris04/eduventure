import { defineConfig } from '@playwright/test'

// Records the real game for the campaign (run from the repo root: npm run record --prefix marketing/eduventure-campaign).
// Needs the game's dev server on 5173 (npm run dev). Uses the installed Chrome (off-screen, GPU) so the 3D world
// renders on the real graphics card.
export default defineConfig({
  testDir: '.',
  testMatch: '*.capture.ts',
  timeout: 900_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: true, // new headless Chrome still renders WebGL on the GPU (ANGLE D3D11) and isn't limited by the screen size
    // Headless screencasts ignore Playwright's emulated pixel ratio, so Chrome itself runs at 2× in a window sized
    // to a 540 × 960 page (the window frame takes 18 × 96 px): frames come out 1080 × 1920.
    viewport: null,
    launchOptions: { args: ['--force-device-scale-factor=2', '--window-size=558,1056'] },
  },
})
