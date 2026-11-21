import { readdirSync, readFileSync, renameSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { answerCorrectly, answerWrongly, promptIs, state, type GameState } from '../../../../tests/e2e/helpers'
import { glide, setCamera, tapGrid, walk, walkTo, type Cam } from './camera'
import { RECORDINGS, shot } from './recorder'

// A real new player's first session, recorded from the live game (local dev server, live Supabase project): loading,
// welcome, the creator, the world, battles answered with real questions, harvesting, the pet, the shop, the boat,
// Science Island, a coding lesson and an English lesson. Answers come from the question files, like the e2e tests.

const PLAY: Cam = { tilt: 40, distance: 15, yaw: 0 } // close to the game's Balanced preset

type Step = { kind: string; text: string; options?: { id: string; text: string }[]; answer?: string | string[]; answer_text?: string; pairs?: [string, string][]; accept?: string[] }
const lessonOf = (file: string) => (JSON.parse(readFileSync(new URL(`../../../../content/courses/${file}`, import.meta.url), 'utf8')) as { units: { lessons: { steps: Step[] }[] }[] }).units[0].lessons[0].steps

async function onboard(page: Page) {
  const next = () => page.getByRole('button', { name: /^Next/ }).click()
  await page.getByRole('button', { name: /Start Your Adventure/ }).click()
  await page.getByLabel('Year you were born').selectOption('2000')
  await next()
  await page.getByRole('button', { name: /Lower Secondary School/ }).click()
  await next()
  await page.getByRole('listbox', { name: 'Where do you study?' }).getByRole('option', { name: /Malaysia/ }).click()
  await next()
  await page.getByRole('button', { name: /International/ }).click()
  await next()
  await page.getByRole('button', { name: 'Not sure / skip' }).click()
  await next()
  await next()
  await page.getByRole('button', { name: 'Science', exact: true }).click()
  await next()
  await next()
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

async function enterWorld(page: Page) {
  await page.getByRole('link', { name: /Enter the World/ }).click()
  await expect(page).toHaveURL(/\/world$/)
  await page.waitForFunction(() => ((window as unknown as { __game?: { getState: () => GameState } }).__game?.getState().player.x ?? 0) > 0, null, { timeout: 30_000 })
  await setCamera(page, PLAY)
  await page.waitForTimeout(2500)
}

/** Walks (unrecorded) to the nearest monster, then records the whole battle at a pace a viewer can follow. */
async function battle(page: Page, name: string, { kind, missFirst = false }: { kind?: string; missFirst?: boolean } = {}) {
  for (let i = 0; i < 14 && (await state(page)).prompt?.kind !== 'monster'; i++) {
    const s = await state(page)
    const m = s.monsters.filter((x) => !kind || x.kind === kind).sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0]
    await tapGrid(page, m)
    await promptIs(page, 'monster').catch(() => undefined)
  }
  await page.waitForTimeout(800)
  await shot(page, name, async () => {
    await page.waitForTimeout(700)
    await page.keyboard.press('e')
    await expect(page.getByRole('dialog', { name: /Battle with/ })).toBeVisible()
    let missed = !missFirst
    for (let i = 0; i < 30 && !(await page.getByRole('button', { name: /Back to/ }).count()); i++) {
      await page.waitForTimeout(1600) // a moment to read the question
      if (missed || !(missed = await answerWrongly(page))) await answerCorrectly(page)
      await page.waitForTimeout(1500) // the attack lands, damage and rewards show
      if (await page.getByRole('button', { name: 'Continue' }).count()) {
        await page.waitForTimeout(1500)
        await page.getByRole('button', { name: 'Continue' }).click()
      }
    }
    await page.waitForTimeout(3500) // Victory, XP and gold (and a level-up if it comes)
  })
  await page.getByRole('button', { name: /Back to/ }).click()
  await page.waitForTimeout(1500)
}

test('part 1: first steps and battles', async ({ page }) => {
  test.setTimeout(1_800_000)
  await page.goto('/welcome')
  await page.evaluate(() => localStorage.setItem('eduventure.camera', JSON.stringify({ tilt: 40, distance: 15, fov: 30, yaw: 0 })))

  await shot(page, 'game-loading', async () => {
    await page.goto('/')
    await page.waitForTimeout(6500)
  })
  await page.goto('/welcome')
  await page.waitForTimeout(2500)
  await shot(page, 'game-welcome', async () => {
    await page.mouse.move(100, 300)
    await page.mouse.move(440, 520, { steps: 40 })
    await page.waitForTimeout(3500)
  })

  await onboard(page)
  await expect(page.getByRole('button', { name: 'Save hero' })).toBeVisible()
  await page.waitForTimeout(1500)
  await shot(page, 'game-creator', async () => {
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: 'Surprise me' }).click()
      await page.waitForTimeout(1100)
    }
    for (const tab of ['Hair', 'Outfit', 'Gear']) {
      await page.getByRole('tab', { name: tab }).click()
      await page.waitForTimeout(1300)
    }
  })
  await page.getByRole('tab', { name: 'Name' }).click()
  await page.getByLabel('Hero name').fill('Aina')
  await page.getByRole('button', { name: 'Save hero' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.waitForTimeout(2500)
  await shot(page, 'game-home', () => page.waitForTimeout(3500))

  await enterWorld(page)
  await shot(page, 'game-walk', async () => {
    await Promise.all([glide(page, PLAY, { tilt: 44, distance: 18, yaw: 35 }, 6000), walk(page, [['ArrowUp', 2200], ['ArrowLeft', 1800], ['ArrowUp', 1500]])])
  })

  await battle(page, 'game-battle-1', { kind: 'sproutling' })
  await battle(page, 'game-battle-2', { missFirst: true })
  await battle(page, 'game-battle-3')

})

// Real Greenhaven harvest trees (from the seed migration), for walking to the nearest one.
const migrations = new URL('../../../../supabase/migrations/', import.meta.url)
const nodesSql = readFileSync(new URL(readdirSync(migrations).filter((f) => f.endsWith('_harvest_nodes.sql')).sort().at(-1)!, migrations), 'utf8')
const trees = [...nodesSql.matchAll(/\('greenhaven', (\d+), (\d+), 'harvest_tree'/g)].map((m) => ({ x: +m[1], y: +m[2] }))

/** Fights a battle quickly and unrecorded (all right answers), to gain XP between shots. */
async function quickBattle(page: Page) {
  for (let i = 0; i < 14 && (await state(page)).prompt?.kind !== 'monster'; i++) {
    const s = await state(page)
    const m = [...s.monsters].sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0]
    await tapGrid(page, m)
    await promptIs(page, 'monster').catch(() => undefined)
  }
  await page.keyboard.press('e')
  for (let i = 0; i < 30 && !(await page.getByRole('button', { name: /Back to/ }).count()); i++) {
    await page.waitForTimeout(1300) // the server wants a moment between answers
    await answerCorrectly(page)
    if (await page.getByRole('button', { name: 'Continue' }).count()) await page.getByRole('button', { name: 'Continue' }).click()
  }
  await page.getByRole('button', { name: /Back to/ }).click()
  await page.waitForTimeout(1000)
}

const level = async (page: Page) => Number(/Lv (\d+)/.exec(await page.getByRole('region', { name: 'Your hero' }).innerText())?.[1] ?? 1)
const xp = async (page: Page) => {
  const m = /(\d+) \/ (\d+) XP/.exec(await page.getByRole('region', { name: 'Your hero' }).innerText())
  return m ? +m[1] : 0
}

test('part 2: level up, harvest, pet, shop, boat, lessons', async ({ page }) => {
  test.setTimeout(1_800_000)
  await page.goto('/welcome')
  await page.evaluate(() => localStorage.setItem('eduventure.camera', JSON.stringify({ tilt: 40, distance: 15, fov: 30, yaw: 0 })))
  await onboard(page)
  await page.getByRole('tab', { name: 'Name' }).click()
  await page.getByLabel('Hero name').fill('Aina')
  await page.getByRole('button', { name: 'Save hero' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await enterWorld(page)

  // A couple of quick unrecorded wins, then record each battle and keep the one where level 1 becomes level 2.
  for (let i = 0; i < 4 && (await xp(page)) < 40; i++) await quickBattle(page)
  for (let i = 0; i < 6 && (await level(page)) < 2; i++) {
    await battle(page, 'tmp-battle')
    if ((await level(page)) >= 2) renameSync(`${RECORDINGS}tmp-battle.mp4`, `${RECORDINGS}game-levelup.mp4`)
  }

  // Harvest: walk to the nearest tree (stand just south of it), three slashes, no question.
  const p = (await state(page)).player
  const tree = [...trees].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]
  await walkTo(page, { x: tree.x + 0.5, y: tree.y + 1.5 }, 'harvest')
  await page.waitForTimeout(1200)
  await shot(page, 'game-harvest', async () => {
    await page.waitForTimeout(500)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('e')
      await page.waitForTimeout(650)
    }
    await page.waitForTimeout(2500)
  })

  // The pet egg hatches at level 2.
  await page.goto('/pet')
  await page.waitForTimeout(2500)
  if (await page.getByRole('button', { name: /Hatch!/ }).count()) {
    await shot(page, 'game-pet', async () => {
      await page.getByRole('button', { name: /Naga/ }).click()
      await page.waitForTimeout(1200)
      await page.getByRole('button', { name: /Hatch!/ }).click()
      await page.waitForTimeout(5000)
    })
  } else console.warn('SHOT SKIPPED game-pet: not level 2 yet')

  await page.goto('/shop')
  await page.waitForTimeout(2500)
  await shot(page, 'game-shop', async () => {
    await page.waitForTimeout(800)
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 140)
      await page.waitForTimeout(220)
    }
    await page.waitForTimeout(1200)
  })

  // The boat to Science Island and a battle there.
  await page.goto('/home')
  await enterWorld(page)
  await shot(page, 'game-boat', async () => {
    await page.evaluate(() => (window as unknown as { __game: { setState: (s: object) => void } }).__game.setState({ travel: { to: 'science_island' } }))
    await page.waitForFunction(() => (window as unknown as { __place: { getState: () => { place: string } } }).__place.getState().place === 'science_island', null, { timeout: 60_000 })
    await page.waitForTimeout(3500)
  })
  await page.waitForFunction(() => ((window as unknown as { __game: { getState: () => GameState } }).__game.getState().player.x ?? 0) > 0)
  await setCamera(page, PLAY)
  await battle(page, 'game-battle-science')

  // A JavaScript lesson: run real code, then predict its output.
  await page.goto('/academy')
  await page.getByRole('link', { name: /JavaScript Basics/ }).click()
  await page.getByRole('link', { name: /^1\.1 / }).click()
  const js = lessonOf('javascript-basics.json')
  await expect(page.getByText(js[0].text)).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1200)
  await shot(page, 'game-code', async () => {
    for (const s of js.slice(0, 2)) {
      await expect(page.getByText(s.text)).toBeVisible({ timeout: 20_000 })
      await page.waitForTimeout(1500)
      if (s.kind === 'learn') await page.getByRole('button', { name: 'Run' }).click()
      if (s.kind === 'predict') {
        if (s.options) await page.getByRole('button', { name: s.options.find((o) => o.id === s.answer)!.text, exact: true }).click()
        else {
          await page.getByLabel('Your answer').fill(s.answer_text!)
          await page.getByRole('button', { name: 'Check' }).click()
        }
      }
      await page.waitForTimeout(2200)
      await page.getByRole('button', { name: 'Continue' }).click()
    }
  })

  // An English lesson: word cards, then a pick.
  await page.goto('/hall')
  await page.getByRole('link', { name: /English/ }).first().click()
  await page.getByRole('link', { name: /^1\.1 / }).click()
  const en = lessonOf('english-basics.json')
  await expect(page.getByText(en[0].text, { exact: true }).first()).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1200)
  await shot(page, 'game-english', async () => {
    for (const s of en.slice(0, 4)) {
      const shown = page.getByText(s.text, { exact: true }).first()
      if (s.kind === 'listen' && !(await shown.isVisible().catch(() => false))) continue
      await expect(shown).toBeVisible({ timeout: 20_000 })
      await page.waitForTimeout(1600)
      if (s.kind === 'pick' || s.kind === 'gap' || s.kind === 'listen') await page.getByRole('button', { name: s.options!.find((o) => o.id === s.answer)!.text, exact: true }).click()
      else if (s.kind !== 'card') break
      await page.waitForTimeout(1500)
      await page.getByRole('button', { name: 'Continue' }).click()
    }
    await page.waitForTimeout(800)
  })

  await page.goto('/home')
  await page.waitForTimeout(3000)
  await shot(page, 'game-home-after', () => page.waitForTimeout(3000))
})

test('part 3: pet hatch, buying gear, the pet in the world', async ({ page }) => {
  test.setTimeout(1_800_000)
  await page.goto('/welcome')
  await page.evaluate(() => localStorage.setItem('eduventure.camera', JSON.stringify({ tilt: 40, distance: 15, fov: 30, yaw: 0 })))
  await onboard(page)
  await page.getByRole('tab', { name: 'Name' }).click()
  await page.getByLabel('Hero name').fill('Aina')
  await page.getByRole('button', { name: 'Save hero' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await enterWorld(page)
  for (let i = 0; i < 8 && (await level(page)) < 2; i++) await quickBattle(page)

  await page.goto('/pet')
  await expect(page.getByRole('button', { name: /Hatch!/ })).toBeVisible()
  await page.waitForTimeout(1500)
  await shot(page, 'game-pet', async () => {
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: /Naga/ }).click()
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /Hatch!/ }).click()
    await page.waitForTimeout(6000)
  })

  await page.goto('/shop')
  await page.waitForTimeout(2500)
  const crown = page.getByTestId('item-leaf_crown')
  if (await crown.getByRole('button', { name: 'Buy Leaf Crown' }).isEnabled()) {
    await shot(page, 'game-buy', async () => {
      await page.waitForTimeout(800)
      await crown.getByRole('button', { name: 'Buy Leaf Crown' }).click()
      await page.waitForTimeout(3500)
    })
  } else console.warn('SHOT SKIPPED game-buy: not enough gold')

  await page.goto('/home')
  await enterWorld(page)
  await shot(page, 'game-pet-world', async () => {
    await Promise.all([glide(page, { tilt: 36, distance: 12, yaw: 0 }, { tilt: 42, distance: 16, yaw: 50 }, 6500), walk(page, [['ArrowUp', 2000], ['ArrowRight', 1800], ['ArrowDown', 1500]])])
  })
})

test('part 4: a coding lesson and an English lesson', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto('/welcome')
  await onboard(page)
  await page.getByRole('tab', { name: 'Name' }).click()
  await page.getByLabel('Hero name').fill('Aina')
  await page.getByRole('button', { name: 'Save hero' }).click()
  await expect(page).toHaveURL(/\/home$/)

  // A JavaScript lesson: run real code, then predict its output.
  await page.goto('/academy')
  await page.getByRole('link', { name: /JavaScript Basics/ }).click()
  await page.getByRole('link', { name: /^1\.1 / }).click()
  const js = lessonOf('javascript-basics.json')
  await expect(page.getByText(js[0].text)).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1200)
  await shot(page, 'game-code', async () => {
    for (const s of js.slice(0, 2)) {
      await expect(page.getByText(s.text)).toBeVisible({ timeout: 20_000 })
      await page.waitForTimeout(1500)
      if (s.kind === 'learn') await page.getByRole('button', { name: 'Run' }).click()
      if (s.kind === 'predict') {
        if (s.options) await page.getByRole('button', { name: s.options.find((o) => o.id === s.answer)!.text, exact: true }).click()
        else {
          await page.getByLabel('Your answer').fill(s.answer_text!)
          await page.getByRole('button', { name: 'Check' }).click()
        }
      }
      await page.waitForTimeout(2200)
      await page.getByRole('button', { name: 'Continue' }).click()
    }
  })

  // An English lesson: word cards, then a pick.
  await page.goto('/hall')
  await page.getByRole('link', { name: /English/ }).first().click()
  await page.getByRole('link', { name: /^1\.1 / }).click()
  const en = lessonOf('english-basics.json')
  await expect(page.getByText(en[0].text, { exact: true }).first()).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1200)
  await shot(page, 'game-english', async () => {
    for (const s of en.slice(0, 4)) {
      const shown = page.getByText(s.text, { exact: true }).first()
      if (s.kind === 'listen' && !(await shown.isVisible().catch(() => false))) continue
      await expect(shown).toBeVisible({ timeout: 20_000 })
      await page.waitForTimeout(1600)
      if (s.kind === 'pick' || s.kind === 'gap' || s.kind === 'listen') await page.getByRole('button', { name: s.options!.find((o) => o.id === s.answer)!.text, exact: true }).click()
      else if (s.kind !== 'card') break
      await page.waitForTimeout(1500)
      await page.getByRole('button', { name: 'Continue' }).click()
    }
    await page.waitForTimeout(800)
  })

})
