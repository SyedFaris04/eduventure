import { useTranslation } from 'react-i18next'
import type { Lang } from './academyApi'

const KEYS: Record<Lang, { label: string; text: string }[]> = {
  python: ['print()', '""', '+', '=', 'if', 'else:', 'for', 'in', 'range()', ':'].map((k) => ({ label: k, text: k })).concat({ label: '⇥', text: '    ' }),
  javascript: ['console.log()', '""', '+', '=', 'let', 'if', 'else', 'for', '{}', ';'].map((k) => ({ label: k, text: k })).concat({ label: '⇥', text: '  ' }),
}

/** Tap-to-insert keys, so phones need little typing. */
export function KeyRow({ language, onKey, disabled }: { language: Lang; onKey: (text: string) => void; disabled?: boolean }) {
  const { t } = useTranslation()
  return (
    <div role="toolbar" aria-label={t('academy.keys')} className="flex flex-wrap gap-1.5">
      {KEYS[language].map((k) => (
        <button
          key={k.label}
          type="button"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()} // keep the editor's cursor where it is
          onClick={() => onKey(k.text)}
          aria-label={t('academy.insertKey', { key: k.label === '⇥' ? t('academy.indent') : k.label })}
          className="min-h-10 min-w-10 rounded-xl border-2 border-wood-dark bg-cream px-2.5 font-mono text-sm font-bold text-ink shadow-[0_2px_0_var(--color-wood-dark)] active:translate-y-[2px] disabled:opacity-40"
        >
          {k.label}
        </button>
      ))}
    </div>
  )
}
