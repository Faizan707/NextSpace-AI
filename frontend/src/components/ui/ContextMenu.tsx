import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface ContextMenuItem {
  id: string
  label: string
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  active?: boolean
}

interface ContextMenuProps {
  /** Custom trigger. Receives open state + props to attach to the clickable control. */
  trigger: (args: {
    open: boolean
    props: {
      id?: string
      type: 'button'
      'aria-haspopup': 'menu'
      'aria-expanded': boolean
      'aria-controls': string
      onClick: () => void
    }
  }) => ReactNode
  items: ContextMenuItem[]
  align?: 'start' | 'end'
  className?: string
  menuClassName?: string
  /** Full width menu matching the trigger (useful for selects). */
  matchTriggerWidth?: boolean
}

export function ContextMenu({
  trigger,
  items,
  align = 'end',
  className,
  menuClassName,
  matchTriggerWidth = false,
}: ContextMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      {trigger({
        open,
        props: {
          type: 'button',
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          'aria-controls': menuId,
          onClick: () => setOpen((value) => !value),
        },
      })}

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-[var(--shadow-panel)]',
            matchTriggerWidth ? 'left-0 right-0 w-full' : 'min-w-[168px]',
            !matchTriggerWidth && (align === 'end' ? 'right-0' : 'left-0'),
            menuClassName,
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-medium transition',
                item.danger ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-surface-2',
                item.active && !item.danger && 'bg-accent-soft text-accent',
                item.disabled && 'cursor-not-allowed opacity-50',
              )}
              onClick={() => {
                if (item.disabled) return
                item.onSelect()
                setOpen(false)
              }}
            >
              <span>{item.label}</span>
              {item.active ? (
                <span className="text-accent" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
