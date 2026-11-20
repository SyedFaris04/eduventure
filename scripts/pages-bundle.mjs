// Lays out the GitHub Pages site in pages/ after `BASE_PATH=/eduventure/play/ vite build`:
//   pages/             the website (dist-site/, from site/ by npm run build:site)
//   pages/play/        the game (dist/)
//   pages/404.html     the game again. GitHub Pages has no fallback for deep links and only ever serves the site's root
//                      404.html, so a cold /eduventure/play/parent?code=…#… must get the game itself, with its path,
//                      query and hash untouched (email and parent links). Its asset URLs already start with
//                      /eduventure/play/, so it works from any path. A path outside the game goes to the website.
//                      The status is 404, so a full reload on a deep path in the Android app would show its offline
//                      page (Capacitor treats HTTP errors as load failures); the game never reloads that way today.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const GAME = '/eduventure/play/'
if (!existsSync('dist/index.html') || !existsSync('dist-site/index.html')) throw new Error('Run the Pages build first (npm run build:pages)')
const index = readFileSync('dist/index.html', 'utf8')
if (!index.includes(`${GAME}assets/`)) throw new Error(`dist/ was not built for ${GAME} (set BASE_PATH)`)

rmSync('pages', { recursive: true, force: true })
mkdirSync('pages', { recursive: true })
cpSync('dist-site', 'pages', { recursive: true })
cpSync('dist', 'pages/play', { recursive: true })
const leave = `<script>if (location.pathname.indexOf('${GAME}') !== 0) location.replace('/eduventure/')</script>`
writeFileSync('pages/404.html', index.replace('<head>', `<head>${leave}`))
writeFileSync('pages/.nojekyll', '')
console.log('pages/ ready')
