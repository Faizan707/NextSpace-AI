import { cn } from '../../lib/cn'
import { controlClass } from './Input'
import { ContextMenu } from './ContextMenu'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  id?: string
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  required?: boolean
  requiredMark?: boolean
  disabled?: boolean
  hint?: string
  className?: string
  placeholder?: string
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('text-muted transition', open && 'rotate-180')}
    >
      <path
        d="M6.7 9.3a1 1 0 0 1 1.4 0L12 13.2l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.7a1 1 0 0 1 0-1.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Custom select — never uses native `<select>` / browser picker UI. */
export function Select({
  id,
  label,
  options,
  value,
  onChange,
  required,
  requiredMark,
  disabled,
  hint,
  className,
  placeholder = 'Select…',
}: SelectProps) {
  const inputId = id ?? label
  const showRequired = requiredMark ?? required
  const selected = options.find((option) => option.value === value)

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink/80">
        {label}
        {showRequired ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>

      <ContextMenu
        matchTriggerWidth
        align="start"
        trigger={({ open, props }) => (
          <button
            {...props}
            id={inputId}
            disabled={disabled}
            className={cn(
              controlClass,
              'flex cursor-pointer items-center justify-between gap-3 text-left',
              open && 'border-accent/50 shadow-[0_0_0_3px_var(--color-accent-soft)]',
              disabled && 'cursor-not-allowed opacity-55',
            )}
          >
            <span className={cn(!selected && 'text-placeholder')}>
              {selected?.label || placeholder}
            </span>
            <ChevronIcon open={open} />
          </button>
        )}
        items={options.map((option) => ({
          id: option.value,
          label: option.label,
          active: option.value === value,
          onSelect: () => onChange(option.value),
        }))}
      />

      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {required && !value ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value=""
          onChange={() => undefined}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      ) : null}
    </div>
  )
}
