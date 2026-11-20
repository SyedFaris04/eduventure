import { defineConfig, devices } from '@playwright/test'

// Multiplayer end-to-end: a local room server (wrangler dev, no Cloudflare account needed) and a dev server pointed at it.
// Run: npm run test:e2e:mp   (creates two guest players on the live Supabase project)
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'multiplayer.spec.ts',
  timeout: 300_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5176',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader'] },
  },
  webServer: [
    { command: 'npm run dev --prefix server/rooms', url: 'http://localhost:8787/health', reuseExistingServer: true, timeout: 120_000 },
    { command: 'npx vite --port 5176 --strictPort', url: 'http://localhost:5176', reuseExistingServer: true, env: { VITE_ROOMS_URL: 'ws://localhost:8787' } },
  ],
})
