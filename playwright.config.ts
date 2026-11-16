import { defineConfig, devices } from '@playwright/test'

// E2E runs against the live Supabase project in .env.local (creates a few guest users per run).
// A second dev server on 5174 points at an unreachable backend to test the offline path.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1, // one shared project + guest sign-in rate limits
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'online', testMatch: 'first-run.spec.ts', use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' } },
    { name: 'offline', testMatch: 'offline.spec.ts', use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174' } },
  ],
  webServer: [
    { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true },
    {
      command: 'npx vite --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      env: { VITE_SUPABASE_URL: 'http://127.0.0.1:9' }, // process env beats .env.local in Vite
    },
  ],
})
