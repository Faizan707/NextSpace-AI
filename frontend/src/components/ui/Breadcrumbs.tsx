import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-1.5 text-sm', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
            {index > 0 ? <span className="text-muted/50">/</span> : null}
            {item.to && !isLast ? (
              <Link to={item.to} className="font-semibold text-accent hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={cn('font-semibold', isLast ? 'text-ink' : 'text-muted')}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
