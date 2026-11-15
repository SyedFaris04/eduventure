import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export type Lang = 'en' | 'ms' | 'es' | 'ar' | 'zh' | 'fr' | 'ja'

export const LANGUAGES: { code: Lang; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'ms', nativeName: 'Bahasa Melayu' },
  { code: 'es', nativeName: 'Español' },
  { code: 'ar', nativeName: 'العربية' },
  { code: 'zh', nativeName: '中文' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'ja', nativeName: '日本語' },
]

const RTL: Lang[] = ['ar']
const STORAGE_KEY = 'eduventure.lang'

// One lazy chunk per language: only the active one (plus English fallback) is downloaded.
const loaders = import.meta.glob<Record<string, unknown>>('./locales/*.json', { import: 'default' })

const isLang = (v: unknown): v is Lang => LANGUAGES.some((l) => l.code === v)

function detectLanguage(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLang(saved)) return saved
  } catch {
    // storage blocked (private mode): fall through to the browser language
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLang(base)) return base
  }
  return 'en'
}

async function loadBundle(lang: Lang) {
  if (i18n.hasResourceBundle(lang, 'translation')) return
  const data = await loaders[`./locales/${lang}.json`]()
  i18n.addResourceBundle(lang, 'translation', data, true, true)
}

function applyToDocument(lang: Lang) {
  document.documentElement.lang = lang
  document.documentElement.dir = RTL.includes(lang) ? 'rtl' : 'ltr'
}

export async function initI18n(): Promise<void> {
  const lang = detectLanguage()
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      lng: lang,
      fallbackLng: 'en',
      resources: {},
      interpolation: { escapeValue: false }, // React already escapes
      returnObjects: true,
    })
  }
  await Promise.all([loadBundle('en'), loadBundle(lang)])
  await i18n.changeLanguage(lang)
  applyToDocument(lang)
}

export async function setLanguage(lang: Lang): Promise<void> {
  await loadBundle(lang)
  await i18n.changeLanguage(lang)
  applyToDocument(lang)
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // not persisted in private mode; the choice still applies for this visit
  }
}

export function currentLanguage(): Lang {
  return isLang(i18n.language) ? i18n.language : 'en'
}

export { i18n }
