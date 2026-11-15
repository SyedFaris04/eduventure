type Props = { value: number; label: string; className?: string }

/** Gold bar in a dark wooden track. `value` is 0..1. */
export function ProgressBar({ value, label, className = '' }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-6 overflow-hidden rounded-full border-[3px] border-wood-dark bg-wood-dark/80 p-[3px] shadow-[inset_0_2px_4px_rgb(0_0_0/0.4)] ${className}`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-b from-[#ffe68a] via-gold to-[#e0a92a] shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)] transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
