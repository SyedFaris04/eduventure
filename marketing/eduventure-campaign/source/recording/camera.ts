import type { Page } from '@playwright/test'

// Camera and movement helpers for recording: the camera store is imported from the Vite dev server (the same module
// instance the game uses), so shots can ease the real game camera smoothly.

export type Cam = { tilt: number; distance: number; fov?: number; yaw: number }
export async function setCamera(page: Page, c: Cam) {
  await page.evaluate(async (cam) => {
    const { useCamera } = (await import('/src/world3d/cameraStore.ts' as string)) as { useCamera: { getState: () => { set: (c: object) => void } } }
    useCamera.getState().set({ fov: 30, ...cam })
  }, c)
}

/** Eases the camera from one setting to another over `ms` (smoothstep), inside the page, frame by frame. */
export async function glide(page: Page, from: Cam, to: Cam, ms: number) {
  await page.evaluate(
    async ([a, b, dur]) => {
      const { useCamera } = (await import('/src/world3d/cameraStore.ts' as string)) as { useCamera: { getState: () => { set: (c: object) => void } } }
      const t0 = performance.now()
      await new Promise<void>((done) => {
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / dur)
          const e = k * k * (3 - 2 * k)
          const mix = (p: number, q: number) => p + (q - p) * e
          useCamera.getState().set({ tilt: mix(a.tilt, b.tilt), distance: mix(a.distance, b.distance), fov: mix(a.fov ?? 30, b.fov ?? 30), yaw: mix(a.yaw, b.yaw) })
          if (k < 1) requestAnimationFrame(step)
          else done()
        }
        requestAnimationFrame(step)
      })
    },
    [from, to, ms] as const,
  )
}

export async function walk(page: Page, moves: [string, number][]) {
  for (const [key, ms] of moves) {
    await page.keyboard.down(key)
    await page.waitForTimeout(ms)
    await page.keyboard.up(key)
  }
}

type World = { __world: { screenOf: (q: { x: number; y: number }) => { x: number; y: number } } }
type Game = { __game: { getState: () => { prompt: { kind: string; id?: string } | null } } }

/** Taps the map at a grid point, kept inside the open middle of the portrait screen (clear of the HUD and pad). */
export async function tapGrid(page: Page, target: { x: number; y: number }) {
  const { pt, w, h } = await page.evaluate((p) => ({ pt: (window as unknown as World).__world.screenOf(p), w: innerWidth, h: innerHeight }), target)
  // Keep taps below the hero card and the minimap (both sit at the top in portrait) and above the bottom controls.
  const boxes = await Promise.all([page.getByRole('region', { name: 'Your hero' }), page.getByRole('button', { name: 'Enlarge map' })].map((l) => l.boundingBox().catch(() => null)))
  const top = Math.max(160, ...boxes.map((b) => (b ? b.y + b.height + 24 : 0)))
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  await page.mouse.click(clamp(pt.x, 70, w - 70), clamp(pt.y, top, h - 260))
}

/** Taps toward a tile until the given prompt appears (the camera eases, so each tap is re-aimed). */
export async function walkTo(page: Page, target: { x: number; y: number }, kind: string, id?: string) {
  const at = () => page.evaluate(([k, i]) => { const p = (window as unknown as Game).__game.getState().prompt; return p?.kind === k && (!i || p.id === i) }, [kind, id] as const)
  for (let i = 0; i < 24 && !(await at()); i++) {
    await tapGrid(page, target)
    await page.waitForFunction(([k, i2]) => { const p = (window as unknown as Game).__game.getState().prompt; return p?.kind === k && (!i2 || p.id === i2) }, [kind, id] as const, { timeout: 8_000 }).catch(() => undefined)
  }
  if (!(await at())) throw new Error(`never reached ${kind}`)
}
