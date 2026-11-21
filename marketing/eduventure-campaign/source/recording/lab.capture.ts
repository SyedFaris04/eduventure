import { test, type Page } from '@playwright/test'
import { glide, setCamera, walk, type Cam } from './camera'
import { shot } from './recorder'

// Cinematic shots from the development world lab (/dev/world): the game's real 3D scenes and models, without the
// interface. The hero walks under keyboard control while the camera store (imported from the Vite dev server, the
// same module the game uses) is eased between two settings for a smooth orbit or dolly. Used as B-roll and labelled
// as in-game scenes, never as a player's own save.

type Scene = { name: string; query: string; from: Cam; to: Cam; moves?: [string, number][]; ms?: number; settle?: number }

async function scene(page: Page, s: Scene) {
  await page.goto(`/dev/world?${s.query}`)
  await setCamera(page, s.from)
  await page.waitForTimeout(s.settle ?? 4000) // models load and the camera settles before recording
  await shot(page, s.name, async () => {
    await page.waitForTimeout(300)
    await Promise.all([glide(page, s.from, s.to, s.ms ?? 7000), walk(page, s.moves ?? [])])
    await page.waitForTimeout(300)
  })
}

const SCENES: Scene[] = [
  // Wide establishing orbit over Greenhaven Kampung.
  { name: 'lab-kampung', query: 'place=greenhaven', from: { tilt: 55, distance: 30, yaw: 0 }, to: { tilt: 45, distance: 22, yaw: 70 }, moves: [['ArrowUp', 2500], ['ArrowRight', 2500]], ms: 8000 },
  // Dolly in from high above to the hero: the "drop into the world" shot.
  { name: 'lab-dropin', query: 'place=greenhaven', from: { tilt: 70, distance: 32, yaw: 300 }, to: { tilt: 30, distance: 11, yaw: 340 }, ms: 6000 },
  { name: 'lab-kampung-raya', query: 'place=greenhaven&festival=raya', from: { tilt: 45, distance: 20, yaw: 20 }, to: { tilt: 38, distance: 15, yaw: 60 }, moves: [['ArrowUp', 3000]], ms: 6000 },
  { name: 'lab-kampung-cny', query: 'place=greenhaven&festival=cny', from: { tilt: 45, distance: 20, yaw: 330 }, to: { tilt: 38, distance: 15, yaw: 290 }, moves: [['ArrowUp', 3000]], ms: 6000 },
  { name: 'lab-kampung-deepavali', query: 'place=greenhaven&festival=deepavali', from: { tilt: 45, distance: 20, yaw: 45 }, to: { tilt: 38, distance: 15, yaw: 10 }, moves: [['ArrowUp', 3000]], ms: 6000 },
  { name: 'lab-science', query: 'place=science_island', from: { tilt: 50, distance: 26, yaw: 0 }, to: { tilt: 40, distance: 18, yaw: 60 }, moves: [['ArrowUp', 3000], ['ArrowRight', 2500]], ms: 7000 },
  { name: 'lab-maths', query: 'place=mathematics_mountains', from: { tilt: 50, distance: 28, yaw: 200 }, to: { tilt: 40, distance: 18, yaw: 140 }, moves: [['ArrowUp', 3000], ['ArrowLeft', 2500]], ms: 7000 },
  { name: 'lab-tech', query: 'place=technology_city', from: { tilt: 50, distance: 26, yaw: 90 }, to: { tilt: 38, distance: 16, yaw: 150 }, moves: [['ArrowUp', 3000], ['ArrowRight', 2500]], ms: 7000 },
  { name: 'lab-language', query: 'place=language_kingdom', from: { tilt: 50, distance: 26, yaw: 270 }, to: { tilt: 38, distance: 16, yaw: 210 }, moves: [['ArrowUp', 3000], ['ArrowLeft', 2500]], ms: 7000 },
  // The camp with every build finished (bench, lantern, flag, whiteboard), built together by the island's players.
  { name: 'lab-camp', query: 'place=greenhaven&camp&at=27,12', from: { tilt: 45, distance: 18, yaw: 340 }, to: { tilt: 35, distance: 13, yaw: 20 }, ms: 6000 },
  // Every My island item laid out (real models; a player places these one by one with materials).
  { name: 'lab-showcase', query: 'place=my_island&showcase&at=16,12', from: { tilt: 60, distance: 26, yaw: 330 }, to: { tilt: 44, distance: 17, yaw: 280 }, ms: 8000, settle: 5000 },
]

test('lab scenes', async ({ page }) => {
  const only = process.env.ONLY?.split(',') // e.g. ONLY=lab-showcase to re-record one scene
  for (const s of SCENES) if (!only || only.includes(s.name)) await scene(page, s)
})
