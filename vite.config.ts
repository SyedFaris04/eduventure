/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pre-bundle the lesson editor at startup; otherwise the dev server reloads the page the first time a lesson opens.
  optimizeDeps: { include: ['codemirror', '@codemirror/state', '@codemirror/view', '@codemirror/lang-python', '@codemirror/lang-javascript'] },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
