import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The website at https://syedfaris04.github.io/eduventure/ (the game lives beside it in play/). npm run build:site
export default defineConfig({
  root: 'site',
  base: '/eduventure/',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../dist-site', emptyOutDir: true },
  server: { port: 5175 },
})
