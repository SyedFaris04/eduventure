import { defineConfig, loadEnv } from 'vite'

// Access-rule tests run against the real Supabase project in .env.local (network, creates guest users).
export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    env: loadEnv(mode, process.cwd(), 'VITE_'),
    testTimeout: 20000,
    hookTimeout: 30000,
  },
}))
