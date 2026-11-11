import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  confirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (open) {
      if (!node.open) node.showModal()
    } else if (node.open) {
      node.close()
    }
  }, [open])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const onClose = () => {
      if (open) onCancel()
    }
    node.addEventListener('close', onClose)
    return () => node.removeEventListener('close', onClose)
  }, [open, onCancel])

  return (
    <dialog
      ref={ref}
      className="m-auto w-[min(420px,calc(100%-2rem))] overflow-hidden rounded-[20px] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-panel)]"
      onCancel={(event) => {
        event.preventDefault()
        if (!confirming) onCancel()
      }}
      onClick={(event) => {
        if (event.target === ref.current && !confirming) onCancel()
      }}
    >
      <div className="px-5 pb-2 pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Confirm</p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-ink">{title}</h2>
        {description ? <div className="mt-2 text-sm text-muted">{description}</div> : null}
      </div>
      <div className="mt-4 flex gap-3 border-t border-line px-5 py-4">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={confirming}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          className="flex-[1.3]"
          disabled={confirming}
          onClick={onConfirm}
        >
          {confirming ? 'Checking…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
