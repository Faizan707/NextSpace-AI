import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

interface AuthCardProps {
  icon?: ReactNode
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  wide?: boolean
}

export function AuthCard({
  icon,
  title,
  subtitle,
  children,
  footer,
  className,
  wide,
}: AuthCardProps) {
  return (
    <div className="relative z-1 grid min-h-dvh place-items-center px-4 py-8">
      <div
        className={cn(
          'fade-up w-full rounded-[var(--radius-card)] border border-line bg-surface p-7 shadow-[var(--shadow-panel)] sm:p-8',
          wide ? 'max-w-[560px]' : 'max-w-[460px]',
          className,
        )}
      >
        <Link to="/" className="mb-5 inline-block font-display text-base font-extrabold tracking-tight text-ink">
          NextSpace
        </Link>

        <div className="mb-5 flex items-start gap-3 border-b border-line pb-5">
          {icon ? (
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-soft text-teal">
              {icon}
            </div>
          ) : null}
          <div>
            <h1 className="m-0 font-display text-[1.55rem] font-bold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
        </div>

        {children}

        {footer ? <div className="mt-5 text-sm text-muted">{footer}</div> : null}
      </div>
    </div>
  )
}
