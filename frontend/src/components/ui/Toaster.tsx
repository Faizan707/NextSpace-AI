import { AnimatePresence, motion } from 'motion/react'
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi'
import { useToastStore, type ToastTone } from '../../stores/toastStore'
import { cn } from '../../lib/cn'

const toneStyles: Record<
  ToastTone,
  { wrap: string; icon: string; Icon: typeof FiCheckCircle }
> = {
  success: {
    wrap: 'border-accent/20 bg-surface',
    icon: 'bg-accent-soft text-accent',
    Icon: FiCheckCircle,
  },
  error: {
    wrap: 'border-danger/20 bg-surface',
    icon: 'bg-danger-soft text-danger',
    Icon: FiAlertCircle,
  },
  info: {
    wrap: 'border-line bg-surface',
    icon: 'bg-bg-elevated text-muted',
    Icon: FiInfo,
  },
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-end gap-2 px-4 sm:top-6 sm:right-6 sm:left-auto sm:px-0"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const tone = toneStyles[item.tone]
          const Icon = tone.Icon
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className={cn(
                'pointer-events-auto flex w-full max-w-[360px] items-start gap-3 rounded-2xl border px-3.5 py-3 shadow-[var(--shadow-panel)]',
                tone.wrap,
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
                  tone.icon,
                )}
              >
                <Icon size={16} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-sm font-semibold text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 m-0 text-xs leading-relaxed text-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(item.id)}
                className="grid size-7 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
              >
                <FiX size={14} aria-hidden />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
