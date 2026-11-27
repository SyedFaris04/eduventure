import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

const calls = vi.hoisted(() => ({ style: [] as unknown[], hidden: 0, listeners: {} as Record<string, () => void> }))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn((name: string, f: () => void) => void (calls.listeners[name] = f)), exitApp: vi.fn() } }))
vi.mock('@capacitor/core', async (orig) => ({ ...(await orig<object>()), SystemBars: { hide: vi.fn(async () => void calls.hidden++) } }))
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: vi.fn(async () => {}) } }))
vi.mock('@capacitor/status-bar', () => ({
  Style: { Dark: 'DARK', Light: 'LIGHT' },
  StatusBar: { setStyle: vi.fn(async (s: unknown) => void calls.style.push(s)), setBackgroundColor: vi.fn(async () => {}) },
}))

const config = JSON.parse(readFileSync('capacitor.config.json', 'utf8'))

describe('Android app shell', () => {
  it('never keeps the splash screen up forever (no internet, or the game fails before it can hide it)', () => {
    expect(config.plugins.SplashScreen.launchAutoHide).toBe(true)
    expect(config.plugins.SplashScreen.launchShowDuration).toBeLessThanOrEqual(10_000)
    expect(readFileSync('android-shell/offline.html', 'utf8')).toMatch(/SplashScreen\??\.hide\(\)/)
  })

  it('uses dark status-bar icons, readable over the light pages behind an edge-to-edge status bar', async () => {
    const { startNative } = await import('./native')
    startNative({ state: { location: { pathname: '/home' } } })
    expect(calls.style).toEqual([{ style: 'LIGHT' }])
  })

  it('plays full screen: the status and navigation bars hide at start and again whenever the app comes back', async () => {
    const { startNative } = await import('./native')
    calls.hidden = 0
    startNative({ state: { location: { pathname: '/home' } } })
    expect(calls.hidden).toBe(1)
    calls.listeners.resume?.() // back from the home screen or a notification: the bars came back
    expect(calls.hidden).toBe(2)
  })
})
