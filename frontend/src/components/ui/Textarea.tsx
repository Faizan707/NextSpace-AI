import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { controlClass } from './Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  requiredMark?: boolean
}

export function Textarea({
  id,
  label,
  requiredMark,
  className,
  required,
  ...props
}: TextareaProps) {
  const inputId = id ?? props.name
  const showRequired = requiredMark ?? required

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink/80">
        {label}
        {showRequired ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      <textarea
        id={inputId}
        required={required}
        className={cn(controlClass, 'resize-y', className)}
        {...props}
      />
    </div>
  )
}
