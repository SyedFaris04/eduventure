import { useTranslation } from 'react-i18next'
import { Lightbulb, Sparkles } from 'lucide-react'

/** After a wrong answer: why the chosen option was wrong, the explanation, and the promise it will come back. */
export function WhyNot({ reason, explanation }: { reason?: string | null; explanation: string }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1 rounded-xl border-2 border-gold bg-[#fff6d6] p-3">
      <p className="flex items-center gap-1 font-display font-bold text-wood-dark">
        <Lightbulb size={18} className="text-path-dark" aria-hidden /> {t('review.whyNot')}
      </p>
      {reason && <p dir="auto" className="text-sm font-semibold">{reason}</p>}
      <p dir="auto" className="text-sm">{explanation}</p>
      <p className="flex items-center gap-1 text-xs font-bold text-path-dark">
        <Sparkles size={14} aria-hidden /> {t('review.comesBack')}
      </p>
    </div>
  )
}
