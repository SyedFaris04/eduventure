import { useId, type InputHTMLAttributes, type Ref } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
  ref?: Ref<HTMLInputElement>
}

/** Labelled text input; `error` is announced and linked via aria-describedby. */
export function Field({ label, error, hint, className = '', ref, ...rest }: Props) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="font-display font-medium short:text-sm">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-11 rounded-xl border-[3px] short:min-h-10 bg-white px-3 text-base text-ink shadow-[inset_0_2px_0_rgb(0_0_0/0.06)] ${
          error ? 'border-danger' : 'border-wood/60 focus:border-water-dark'
        }`}
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink/70 short:text-xs tiny:hidden">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
