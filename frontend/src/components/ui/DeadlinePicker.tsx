import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { FiCalendar } from 'react-icons/fi'
import { Button } from './Button'
import { cn } from '../../lib/cn'
import 'react-day-picker/style.css'

interface DeadlinePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  label?: string
  hint?: string
  className?: string
}

export function DeadlinePicker({
  value,
  onChange,
  label = 'Deadline',
  hint = 'Optional. Pick a due date from the calendar.',
  className,
}: DeadlinePickerProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink/80">{label}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
        {value ? (
          <Button type="button" variant="ghost" className="h-8 rounded-lg px-3 text-xs" onClick={() => onChange(undefined)}>
            Clear
          </Button>
        ) : null}
      </div>

      <div className="deadline-picker overflow-hidden rounded-[20px] border border-line bg-surface-2 p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-surface px-3.5 py-3">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted">Selected</p>
            <p className="mt-0.5 font-display text-base font-semibold text-ink">
              {value ? format(value, 'EEE, MMM d, yyyy') : 'No deadline'}
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
            <FiCalendar size={18} aria-hidden />
          </span>
        </div>

        <DayPicker
          mode="single"
          selected={value}
          onSelect={onChange}
          defaultMonth={value}
          weekStartsOn={1}
          showOutsideDays
          className="deadline-daypicker mx-auto"
        />
      </div>
    </div>
  )
}
