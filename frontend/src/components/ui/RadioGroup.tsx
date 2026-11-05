import { cn } from '../../lib/cn'

export type RadioOption = {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  name: string
  label: string
  options: RadioOption[]
  defaultValue?: string
  required?: boolean
  className?: string
}

export function RadioGroup({
  name,
  label,
  options,
  defaultValue,
  required,
  className,
}: RadioGroupProps) {
  const labelId = `${name}-label`

  return (
    <div className={cn('grid gap-1.5', className)} role="radiogroup" aria-labelledby={labelId}>
      <p id={labelId} className="text-sm font-medium text-ink/80">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </p>
      <div className="grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 transition has-checked:border-accent/50 has-checked:bg-accent-soft has-checked:shadow-[0_0_0_3px_var(--color-accent-soft)] hover:border-accent/30"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              required={required}
              defaultChecked={option.value === defaultValue}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
