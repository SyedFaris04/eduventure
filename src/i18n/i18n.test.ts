import { beforeAll, describe, expect, it } from 'vitest'
import { initI18n, LANGUAGES, setLanguage } from './index'

const locales = import.meta.glob<Record<string, unknown>>('./locales/*.json', { eager: true, import: 'default' })

/** Every leaf path, e.g. "loading.tips.3". Metadata keys starting with "_" are ignored. */
function keyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix]
  return Object.entries(obj as Record<string, unknown>)
    .filter(([k]) => !k.startsWith('_'))
    .flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k))
    .sort()
}

describe('i18n', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('switches the document to right-to-left for Arabic', async () => {
    await setLanguage('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
  })

  it('switches back to left-to-right for Malay', async () => {
    await setLanguage('ms')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('ms')
  })

  it('has a locale file for every listed language', () => {
    const files = Object.keys(locales).map((p) => p.match(/(\w+)\.json$/)![1]).sort()
    expect(files).toEqual(LANGUAGES.map((l) => l.code).sort())
  })

  it('every locale has exactly the English key set', () => {
    const en = keyPaths(locales['./locales/en.json'])
    expect(en.length).toBeGreaterThan(10)
    for (const [path, data] of Object.entries(locales)) {
      expect(keyPaths(data), path).toEqual(en)
    }
  })

  it('every literal t("…") key used in the source exists in English', () => {
    const sources = import.meta.glob<string>('../**/*.tsx', { eager: true, query: '?raw', import: 'default' })
    const en = new Set(keyPaths(locales['./locales/en.json']))
    // Keys with a defaultValue or built at run time (template strings) are not literal and are skipped.
    const missing = Object.entries(sources).flatMap(([file, code]) =>
      [...code.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'\s*[,)]/g)].map((m) => m[1]).filter((k) => !en.has(k) && ![...en].some((p) => p.startsWith(`${k}.`))).map((k) => `${file}: ${k}`),
    )
    expect(missing).toEqual([])
  })

  it('has at least 8 tips and 12 facts in English', () => {
    const en = locales['./locales/en.json'] as { loading: { tips: string[]; facts: string[] } }
    expect(en.loading.tips.length).toBeGreaterThanOrEqual(8)
    expect(en.loading.facts.length).toBeGreaterThanOrEqual(12)
  })
})
