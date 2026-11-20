import { readFileSync } from 'node:fs'
import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import { COPY } from './copy'
import { APK_URL, PLAY_URL } from './links'

function paths(o: unknown, prefix = ''): string[] {
  if (typeof o === 'string') return [prefix]
  return Object.entries(o as object).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k)).sort()
}
function strings(o: unknown): string[] {
  return typeof o === 'string' ? [o] : Object.values(o as object).flatMap(strings)
}

describe('website copy', () => {
  it('has every text in English and Malay', () => {
    expect(paths(COPY.ms)).toEqual(paths(COPY.en))
    for (const s of [...strings(COPY.en), ...strings(COPY.ms)]) expect(s.trim()).not.toBe('')
  })

  it('links to the newest app and to the game', () => {
    expect(APK_URL).toBe('https://github.com/SyedFaris04/eduventure/releases/latest/download/eduventure.apk')
    expect(PLAY_URL).toBe('play/')
  })

  it('the QR code on the page is the download link', async () => {
    const svg = await QRCode.toString(APK_URL, { type: 'svg', margin: 1, color: { dark: '#3b2a1e', light: '#ffffff' } })
    expect(readFileSync('site/public/apk-qr.svg', 'utf8')).toBe(svg)
  })
})
