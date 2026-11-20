import { useEffect, useState } from 'react'
import { COPY, type Lang } from './copy'

const KEY = 'eduventure.site.lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'ms') return saved
  } catch {
    // storage blocked: fall back to the browser's language
  }
  return navigator.language?.toLowerCase().startsWith('ms') ? 'ms' : 'en'
}

/** English or Malay, remembered on this device. */
export function useLang() {
  const [lang, setLang] = useState<Lang>(initial)
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = COPY[lang].meta.title
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      // not remembered; still switched
    }
  }, [lang])
  return [lang, setLang, COPY[lang]] as const
}
