import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiCpu } from 'react-icons/fi'
import { AnimatePresence, motion } from 'motion/react'
import { Drawer } from '../ui'
import { AiChatWorkspace } from './AiChatWorkspace'
import { cn } from '../../lib/cn'

export function AiAssistantFab() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const onFullPage = location.pathname.startsWith('/app/ai')

  if (onFullPage) return null

  return (
    <>
      <AnimatePresence>
        {!open ? (
          <motion.button
            type="button"
            key="ai-fab"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={() => setOpen(true)}
            className={cn(
              'fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full',
              'bg-accent px-4 py-3 text-sm font-semibold text-ink-on-accent',
              'shadow-[0_12px_28px_rgba(37,99,235,0.32)]',
              'hover:bg-accent-bright focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-accent focus-visible:ring-offset-2',
              'md:bottom-6 md:right-6',
            )}
            aria-label="Open AI assistant"
          >
            <FiCpu size={18} aria-hidden />
            <span>AI</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="AI Assistant"
        eyebrow="NextSpace"
        description="Ask about work or take action while you browse."
        size="lg"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      >
        <AiChatWorkspace compact autoFocus={open} />
      </Drawer>
    </>
  )
}
