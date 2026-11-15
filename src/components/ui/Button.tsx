import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-gold to-path-dark text-ink border-wood-dark shadow-[0_4px_0_var(--color-wood-dark),inset_0_2px_0_rgb(255_255_255/0.5)] active:shadow-[0_1px_0_var(--color-wood-dark)]',
  secondary:
    'bg-cream text-ink border-wood shadow-[0_4px_0_var(--color-wood),inset_0_2px_0_rgb(255_255_255/0.7)] active:shadow-[0_1px_0_var(--color-wood)]',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-wood/10',
}

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-5 text-base',
  lg: 'min-h-14 px-8 text-xl',
}

/** Shared so router links can look exactly like buttons. */
export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] font-display font-semibold tracking-wide transition-transform duration-75 active:translate-y-[3px] disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${extra}`
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />
}
