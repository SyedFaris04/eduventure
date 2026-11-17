import { useTranslation } from 'react-i18next'
import { RefreshCw, TerminalSquare } from 'lucide-react'
import type { RunResult } from './runner/runner'

export type RunStatus = 'idle' | 'loading' | 'running' | 'unavailable'

/** Program output. Errors, time-outs and a Python that couldn't load are explained in plain words. */
export function Terminal({ result, status, onRetry }: { result: RunResult | null; status: RunStatus; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('academy.terminal')} className="rounded-[14px] border-[3px] border-wood-dark bg-[#0f131c] p-3 font-mono text-sm text-[#d7f5d0]">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#8a8fa3] uppercase">
        <TerminalSquare size={14} aria-hidden /> {t('academy.terminal')}
      </p>
      <div aria-live="polite" className="max-h-56 min-h-12 overflow-auto whitespace-pre-wrap break-words">
        {status === 'loading' && <p className="text-gold">{t('academy.pythonLoading')}</p>}
        {status === 'running' && <p className="text-[#8a8fa3]">{t('academy.running')}</p>}
        {status === 'unavailable' && (
          <div className="space-y-2 font-sans">
            <p className="font-semibold text-[#ffb4a8]">{t('academy.pythonFailed')}</p>
            <button type="button" onClick={onRetry} className="flex items-center gap-1 rounded-lg border-2 border-cream/60 px-2 py-1 font-bold text-cream">
              <RefreshCw size={14} aria-hidden /> {t('academy.retry')}
            </button>
          </div>
        )}
        {status === 'idle' && result && (
          <>
            {result.stdout ? <p>{result.stdout}</p> : !result.error && !result.timedOut && <p className="text-[#8a8fa3]">{t('academy.noOutput')}</p>}
            {result.error && <p className="text-[#ffb4a8]">{result.error}</p>}
            {result.timedOut && <p className="font-sans font-semibold text-gold">{t('academy.timedOut')}</p>}
            {result.truncated && <p className="font-sans text-xs text-[#8a8fa3]">{t('academy.truncated')}</p>}
          </>
        )}
      </div>
    </section>
  )
}
