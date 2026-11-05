import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'icon'

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition duration-160 ease-out disabled:cursor-not-allowed disabled:opacity-55'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-ink-on-accent shadow-[0_10px_24px_rgba(37,99,235,0.28)] hover:bg-accent-bright',
  secondary:
    'bg-surface text-ink border border-line shadow-sm hover:bg-surface-2',
  ghost: 'bg-transparent text-muted border border-transparent hover:text-ink hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger border border-danger/20 hover:bg-danger/10',
}

const sizes: Record<ButtonSize, string> = {
  md: 'px-6 py-3.5 text-[0.95rem]',
  icon: 'size-9 shrink-0 p-0 text-sm',
}

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  className?: string,
  size: ButtonSize = 'md',
) {
  return cn(base, variants[variant], sizes[size], className)
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, className, size)} {...props} />
  )
}
