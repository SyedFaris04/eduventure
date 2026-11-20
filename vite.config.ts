/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves the game at /eduventure/play/ (npm run build:pages); everything else runs at /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  // Pre-bundle the lesson editor at startup; otherwise the dev server reloads the page the first time a lesson opens.
  optimizeDeps: { include: ['codemirror', '@codemirror/state', '@codemirror/view', '@codemirror/lang-python', '@codemirror/lang-javascript'] },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/**/src/**/*.test.ts'],
  },
})
