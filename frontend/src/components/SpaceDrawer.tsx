import { useEffect } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Space, SpacePayload, SpaceType } from '../types'
import { Button, Input, RadioGroup, Textarea } from './ui'

interface SpaceDrawerProps {
  open: boolean
  title: string
  initial?: Partial<Space> | null
  submitting?: boolean
  onClose: () => void
  onSubmit: (payload: SpacePayload) => Promise<void>
}

export function SpaceDrawer({
  open,
  title,
  initial,
  submitting,
  onClose,
  onSubmit,
}: SpaceDrawerProps) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onSubmit({
      name: String(form.get('name') || ''),
      description: String(form.get('description') || '') || null,
      space_type: String(form.get('space_type') || 'private') as SpaceType,
    })
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            aria-label="Close drawer"
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-[-20px_0_50px_rgba(15,23,42,0.12)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex items-start justify-between border-b border-line px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Space</p>
                <h2 className="mt-1 font-display text-xl font-bold text-ink">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-full border border-line text-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form
              key={initial?.id ?? 'new'}
              className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
              onSubmit={handleSubmit}
            >
              <Input
                id="space-name"
                name="name"
                label="Name"
                required
                defaultValue={initial?.name ?? ''}
                placeholder="Design critique"
              />
              <Textarea
                id="space-description"
                name="description"
                label="Description"
                rows={4}
                defaultValue={initial?.description ?? ''}
                placeholder="What happens in this space?"
              />
              <RadioGroup
                name="space_type"
                label="Type"
                required
                defaultValue={initial?.space_type ?? 'private'}
                options={[
                  {
                    value: 'public',
                    label: 'Public',
                    description: 'Visible to everyone in the company',
                  },
                  {
                    value: 'specific',
                    label: 'Specific',
                    description: 'Only selected members can access',
                  },
                  {
                    value: 'private',
                    label: 'Private',
                    description: 'Only you and invited people',
                  },
                ]}
              />

              <div className="mt-auto flex gap-3 border-t border-line pt-5">
                <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-[1.3]" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save space'}
                </Button>
              </div>
            </form>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
