// Lays out the GitHub Pages site in pages/ after `BASE_PATH=/eduventure/play/ vite build`:
//   pages/index.html        the download page (site/index.html; the website project replaces it)
//   pages/play/             the game (dist/)
//   pages/play/404.html     the game again, so a deep link like /eduventure/play/home opens the game (Pages has no
//                           fallback of its own; the router reads the path, and the 404 status is harmless)
//   pages/404.html          anything else under /eduventure/ goes back to the download page
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'

if (!existsSync('dist/index.html')) throw new Error('Run the Pages build first (npm run build:pages)')
rmSync('pages', { recursive: true, force: true })
mkdirSync('pages', { recursive: true })
cpSync('site', 'pages', { recursive: true })
cpSync('dist', 'pages/play', { recursive: true })
cpSync('dist/index.html', 'pages/play/404.html')
writeFileSync(
  'pages/404.html',
  `<!doctype html><meta charset="utf-8"><title>Eduventure</title><script>
  var p = location.pathname, game = '/eduventure/play/';
  location.replace(p.indexOf(game) === 0 ? game : '/eduventure/');
</script>`,
)
writeFileSync('pages/.nojekyll', '')
console.log('pages/ ready')
