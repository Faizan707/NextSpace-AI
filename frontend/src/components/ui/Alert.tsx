import { cn } from '../../lib/cn'

interface AlertProps {
  children: string
  className?: string
}

export function Alert({ children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-[var(--radius-control)] border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger',
        className,
      )}
    >
      {children}
    </div>
  )
}
