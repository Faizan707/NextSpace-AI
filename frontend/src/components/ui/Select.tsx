import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { controlClass } from './Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: Array<{ value: string; label: string }>
  requiredMark?: boolean
}

export function Select({
  id,
  label,
  options,
  requiredMark,
  className,
  required,
  ...props
}: SelectProps) {
  const inputId = id ?? props.name
  const showRequired = requiredMark ?? required

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink/80">
        {label}
        {showRequired ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      <select id={inputId} required={required} className={cn(controlClass, className)} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
