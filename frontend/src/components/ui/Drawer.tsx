import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from './Button'
import { cn } from '../../lib/cn'

interface DrawerProps {
  open: boolean
  title: string
  eyebrow?: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
  headerExtra?: ReactNode
}

export function Drawer({
  open,
  title,
  eyebrow,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  headerExtra,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            aria-label="Close drawer"
            className="absolute inset-0 cursor-pointer bg-ink/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative z-10 flex h-full w-full flex-col border-l border-line bg-surface shadow-[-20px_0_50px_rgba(15,23,42,0.12)]',
              size === 'lg' ? 'max-w-xl' : 'max-w-md',
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex items-start justify-between border-b border-line px-6 py-5">
              <div className="min-w-0 pr-3">
                {eyebrow ? (
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">
                    {eyebrow}
                  </p>
                ) : null}
                <h2 className="mt-1 font-display text-xl font-bold text-ink">{title}</h2>
                {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
                {headerExtra}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">{children}</div>

            {footer ? (
              <div className="border-t border-line px-6 py-4">{footer}</div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
