import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { currentLanguage, LANGUAGES, setLanguage, type Lang } from './index'

export function LanguagePicker({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation() // re-renders on language change
  return (
    <label className={`inline-flex items-center gap-2 rounded-xl border-[3px] border-wood bg-cream/90 px-2 py-1 text-ink shadow-[0_3px_0_var(--color-wood)] ${className}`}>
      <Languages size={18} aria-hidden />
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={i18n.language ? currentLanguage() : 'en'}
        onChange={(e) => void setLanguage(e.target.value as Lang)}
        className="min-h-8 cursor-pointer bg-transparent font-display font-medium outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </label>
  )
}
