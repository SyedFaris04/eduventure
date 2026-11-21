import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLElement> & { title?: ReactNode }

/** Parchment board in a wooden frame, the base container for every menu. */
export function Panel({ title, className = '', children, ...rest }: Props) {
  return (
    <section
      className={`relative rounded-3xl border-4 border-wood bg-cream p-5 short:rounded-2xl short:border-[3px] short:p-3 shadow-[0_0_0_3px_var(--color-wood-dark),0_10px_24px_rgb(59_42_30/0.35),inset_0_0_0_3px_rgb(255_255_255/0.6)] ${title ? 'pt-9 short:pt-6' : ''} ${className}`}
      {...rest}
    >
      {title && (
        <h2 className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border-[3px] border-wood-dark bg-gradient-to-b from-wood to-wood-dark px-5 py-1 text-lg font-semibold short:-top-3.5 short:px-3 short:py-0.5 short:text-sm text-cream shadow-[0_3px_0_rgb(59_42_30/0.5)]">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
