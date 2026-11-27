import { expect, test, type Browser, type Page } from '@playwright/test'
import { enterWorld, newPlayer } from './helpers'

// Every screen on the player's path fits a phone held sideways, with no page scroll and nothing off the side
// (spec docs/superpowers/specs/2026-11-21-phone-fit-design.md). 640 × 300 is a phone in Chrome with the address bar.
// 844 × 390 (most iPhones and Pixels sideways) is wide enough for the tablet (md) rules to apply too.
const SIZES = [
  { width: 740, height: 360 },
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]

async function phone(browser: Browser, size: { width: number; height: number }, storageState?: string) {
  const ctx = await browser.newContext({ viewport: size, hasTouch: true, isMobile: true, storageState })
  return ctx.newPage()
}

/** The page does not scroll either way, and no box clips or scrolls its own content (a modal's body may). */
async function expectFits(page: Page, name: string, { boxes = true, root = 'main' } = {}) {
  await page.waitForTimeout(600)
  const m = await page.evaluate(() => ({
    h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    w: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    vh: innerHeight,
    vw: innerWidth,
  }))
  expect.soft(m.h, `${name}: ${m.h}px tall on a ${m.vh}px screen`).toBeLessThanOrEqual(m.vh + 1)
  expect.soft(m.w, `${name}: ${m.w}px wide on a ${m.vw}px screen`).toBeLessThanOrEqual(m.vw + 1)
  if (!boxes) return
  const clipped = await page.evaluate((root) =>
    [...document.querySelectorAll(`${root} *`)]
      .filter((e) => {
        const el = e as HTMLElement
        const css = getComputedStyle(el)
        const oy = css.overflowY
        // A deliberate line clamp (text ending in …) is not a clipped layout.
        if (css.webkitLineClamp && css.webkitLineClamp !== 'none') return false
        return oy !== 'visible' && el.clientHeight > 24 && el.scrollHeight > el.clientHeight + 2 && !el.closest('dialog') && !(el instanceof HTMLSelectElement)
      })
      .map((e) => `${e.tagName.toLowerCase()}.${(e as HTMLElement).className.toString().split(' ').slice(0, 4).join('.')} (${(e as HTMLElement).scrollHeight}>${(e as HTMLElement).clientHeight})`),
    root,
  )
  expect.soft(clipped, `${name}: boxes that clip or scroll their content`).toEqual([])
}

/** Thin progress bars still leave room for their gold fill (a thick frame once left them 0 px tall). */
async function expectFillShows(page: Page, name: string) {
  const fills = await page.getByRole('progressbar').evaluateAll((bars) => bars.map((b) => (b.firstElementChild as HTMLElement | null)?.getBoundingClientRect().height ?? 0))
  expect.soft(fills.length, `${name}: no progress bars`).toBeGreaterThan(0)
  expect.soft(Math.min(...fills), `${name}: fill heights ${fills.join(', ')}`).toBeGreaterThanOrEqual(3)
}

async function expectInView(page: Page, name: string, locator: ReturnType<Page['locator']>) {
  const box = await locator.boundingBox()
  const vp = page.viewportSize()!
  expect.soft(box, `${name}: not on screen`).not.toBeNull()
  if (box) expect.soft(box.y + box.height, `${name}: below the screen`).toBeLessThanOrEqual(vp.height + 1)
}

test.describe('phone fit', () => {
  test.describe.configure({ timeout: 900_000 })

  test('signed out: loading, welcome, login, signup, explore', async ({ browser }) => {
    for (const size of SIZES) {
      const page = await phone(browser, size)
      const tag = `${size.width}x${size.height}`
      await page.goto('/welcome')
      await expectFits(page, `${tag} welcome`)
      await expectInView(page, `${tag} welcome start`, page.getByRole('button', { name: /Start Your Adventure/ }))
      await expectInView(page, `${tag} welcome explore`, page.getByRole('link', { name: /Explore the World/ }))
      for (const path of ['/login', '/signup', '/explore']) {
        await page.goto(path)
        await expectFits(page, `${tag} ${path}`)
      }
      // The sign-in forms use the width of the phone, not a narrow column in the middle.
      await page.goto('/login')
      const form = (await page.locator('form').boundingBox())!
      expect.soft(form.width, `${tag} login form width`).toBeGreaterThanOrEqual(size.width * 0.6)
      await page.context().close()
    }
  })

  // Phones often run a larger font or display size (Android "Font size", Chrome text scaling): the first screens must
  // still fit, and the login and signup forms use the width of wider phones instead of sitting in a narrow column.
  test('welcome, login and signup fit with a 125% font and fill wide phones', async ({ browser }) => {
    for (const size of [...SIZES, { width: 915, height: 412 }]) {
      const tag = `${size.width}x${size.height} big font`
      const page = await phone(browser, size)
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => (document.documentElement.style.fontSize = '125%'))
      })
      for (const path of ['/welcome', '/login', '/signup']) {
        await page.goto(path)
        await page.waitForTimeout(800)
        await expectFits(page, `${tag} ${path}`)
      }
      await expectInView(page, `${tag} signup button`, page.getByRole('button', { name: 'Create account' }))
      await page.context().close()
    }
  })

  // The owner's phone (2026-11-27): 694 × 296 once the status bar and camera cut-out are taken, with a larger font.
  // A reviewer has an extra Home button, and a hatched pet fills the pet page: Home, the pet page and the world's
  // settings must still fit with nothing cut off.
  test('a reviewer with a hatched pet on a 694x296 phone with a 125% font', async ({ browser }) => {
    const tag = '694x296 big font'
    const page = await phone(browser, { width: 694, height: 296 })
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => (document.documentElement.style.fontSize = '125%')))
    await newPlayer(page)
    await page.route('**/rest/v1/rpc/my_roles*', (route) => route.fulfill({ json: ['admin'] }))
    await page.route('**/rest/v1/player_pets*', (route) =>
      route.fulfill({ json: { species: 'naga', name: 'comel', stage: 'baby', form: null, points: 16, branches: { science: 6, maths: 4, technology: 3, language: 3 }, look: {} } }),
    )
    await page.goto('/home')
    await expect(page.getByRole('link', { name: /Review questions/ })).toBeVisible()
    await expectFits(page, `${tag} home`)
    await expectInView(page, `${tag} review questions`, page.getByRole('link', { name: /Review questions/ }))
    await expectFillShows(page, `${tag} home XP bar`)
    await page.goto('/pet')
    await expect(page.getByText('16 / 100 pet points')).toBeVisible()
    await expectFits(page, `${tag} pet`)
    await expectFillShows(page, `${tag} pet bars`)
    await page.goto('/home')
    await enterWorld(page)
    await expectFillShows(page, `${tag} world HUD XP bar`)
    await page.getByRole('button', { name: 'Settings' }).click()
    await expectFits(page, `${tag} world settings`, { root: '[role=dialog]' }) // the HUD's round picture crops on purpose
    await expectInView(page, `${tag} settings reset`, page.getByRole('button', { name: 'Reset camera' }))
    await page.context().close()
  })

  for (const size of SIZES)
  test(`onboarding, creator, home and the pages off home at ${size.width}x${size.height}`, async ({ browser }) => {
    {
      const tag = `${size.width}x${size.height}`
      const page = await phone(browser, size)
      const next = () => page.getByRole('button', { name: 'Next', exact: true }).click()
      await page.goto('/welcome')
      await page.getByRole('button', { name: /Start Your Adventure/ }).click()
      await expectFits(page, `${tag} onboarding age`)
      await page.getByLabel('Year you were born').selectOption('2000')
      await next()
      await expectFits(page, `${tag} onboarding level`)
      await page.getByRole('button', { name: /Lower Secondary School/ }).click()
      await next()
      await expectFits(page, `${tag} onboarding country`)
      await page.getByPlaceholder('Search countries').fill('Malaysia') // phones page the list: search, as a player would
      await page.getByRole('listbox', { name: 'Where do you study?' }).getByRole('option', { name: /Malaysia/ }).click()
      await next()
      await expectFits(page, `${tag} onboarding curriculum`)
      await page.getByRole('button', { name: /International/ }).click()
      await next()
      await expectFits(page, `${tag} onboarding grade`)
      await page.getByRole('button', { name: 'Not sure / skip' }).click()
      await next()
      await expectFits(page, `${tag} onboarding language`)
      await next()
      await expectFits(page, `${tag} onboarding subjects`)
      await page.getByRole('button', { name: 'Science', exact: true }).click()
      await next()
      await expectFits(page, `${tag} onboarding goals`)
      await next()
      await expectFits(page, `${tag} onboarding difficulty`)
      await expectInView(page, `${tag} onboarding finish`, page.getByRole('button', { name: 'Save and continue' }))
      await page.getByRole('button', { name: 'Save and continue' }).click()

      await expect(page.getByRole('button', { name: 'Save hero' })).toBeVisible()
      for (const tab of ['Body', 'Hair', 'Face', 'Outfit', 'Gear', 'Name']) {
        await page.getByRole('tab', { name: tab }).click()
        await expectFits(page, `${tag} creator ${tab}`)
      }
      await expectInView(page, `${tag} creator save`, page.getByRole('button', { name: 'Save hero' }))
      await page.getByLabel('Hero name').fill('Fit Tester')
      await page.getByRole('button', { name: 'Save hero' }).click()
      await expect(page).toHaveURL(/\/home$/)
      await expectFits(page, `${tag} home`)
      await expectInView(page, `${tag} home enter world`, page.getByRole('link', { name: /Enter the World/ }))

      for (const path of ['/shop', '/pet', '/library', '/academy', '/academy/python-basics', '/hall', '/settings/academic']) {
        await page.goto(path)
        await page.waitForTimeout(1200)
        await expectFits(page, `${tag} ${path}`)
      }

      // The egg picker appears at level 2: stand in a level-2 answer for the player's XP row and look at it.
      await page.route('**/rest/v1/player_xp*', (route) => route.fulfill({ json: { xp: 150, level: 2 } }))
      await page.goto('/pet')
      await expect(page.getByRole('button', { name: /Hatch!/ })).toBeVisible()
      await expectFits(page, `${tag} pet egg picker`)
      await expectInView(page, `${tag} hatch`, page.getByRole('button', { name: /Hatch!/ }))
      await page.unroute('**/rest/v1/player_xp*')

      await page.goto('/home')
      await enterWorld(page)
      await expectFits(page, `${tag} world`, { boxes: false })
      const box = async (name: string) => (await page.getByLabel(name, { exact: true }).first().boundingBox())!
      const hud = await box('Your hero')
      const map = await box('Enlarge map')
      const pad = await box('Movement pad')
      expect.soft(hud.height, `${tag} hero card height`).toBeLessThanOrEqual(56)
      expect.soft(map.width, `${tag} minimap width`).toBeLessThanOrEqual(130)
      expect.soft(map.height, `${tag} minimap height`).toBeLessThanOrEqual(90)
      expect.soft(pad.width, `${tag} joystick size`).toBeLessThanOrEqual(104)
      await page.context().close()
    }
  })
})

