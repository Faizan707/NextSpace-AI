import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export const controlClass =
  'w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3.5 text-ink outline-none transition duration-160 placeholder:text-placeholder focus:border-accent/50 focus:shadow-[0_0_0_3px_var(--color-accent-soft)] user-invalid:not-placeholder-shown:not-focus:border-danger/65'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  requiredMark?: boolean
  leading?: ReactNode
}

export function Input({
  id,
  label,
  hint,
  requiredMark,
  leading,
  className,
  required,
  ...props
}: InputProps) {
  const inputId = id ?? props.name
  const showRequired = requiredMark ?? required

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink/80">
        {label}
        {showRequired ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
            {leading}
          </span>
        ) : null}
        <input
          id={inputId}
          required={required}
          className={cn(controlClass, leading ? 'pl-11' : null, className)}
          {...props}
        />
      </div>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}
