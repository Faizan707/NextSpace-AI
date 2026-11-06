import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FiDownload, FiX } from 'react-icons/fi'
import { Button } from '../ui'
import type { SpaceDocument } from '../../types'
import { formatBytes } from './format'
import { cn } from '../../lib/cn'

interface DocumentPreviewModalProps {
  open: boolean
  file: SpaceDocument | null
  token: string | null
  downloadUrl: string | null
  onClose: () => void
  onDownload: (document: SpaceDocument) => void
}

type PreviewKind = 'image' | 'pdf' | 'text' | 'docx' | 'unsupported'

function getExt(name: string) {
  return name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
}

function getPreviewKind(document: SpaceDocument): PreviewKind {
  const ext = getExt(document.original_name)
  const type = (document.content_type || '').toLowerCase()

  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image'
  }
  if (type.includes('pdf') || ext === 'pdf') return 'pdf'
  if (
    type.startsWith('text/') ||
    ['txt', 'md', 'csv', 'json', 'log', 'xml', 'yml', 'yaml'].includes(ext)
  ) {
    return 'text'
  }
  if (['doc', 'docx'].includes(ext) || type.includes('word') || type.includes('msword')) {
    return 'docx'
  }
  return 'unsupported'
}

export function DocumentPreviewModal({
  open,
  file,
  token,
  downloadUrl,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    window.document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      window.document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !file || !token || !downloadUrl) return

    const url: string = downloadUrl
    const authToken: string = token
    let cancelled = false
    let createdUrl: string | null = null
    const kind = getPreviewKind(file)

    async function load() {
      setLoading(true)
      setError(null)
      setObjectUrl(null)
      setTextContent(null)
      setDocxHtml(null)

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!response.ok) throw new Error('Failed to load preview')
        const blob = await response.blob()
        if (cancelled) return

        if (kind === 'image' || kind === 'pdf') {
          createdUrl = URL.createObjectURL(blob)
          setObjectUrl(createdUrl)
        } else if (kind === 'text') {
          setTextContent(await blob.text())
        } else if (kind === 'docx') {
          const mammoth = await import('mammoth')
          const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() })
          if (cancelled) return
          setDocxHtml(result.value || '<p>No preview content.</p>')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Preview failed')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [open, file, token, downloadUrl])

  const kind = file ? getPreviewKind(file) : 'unsupported'

  return (
    <AnimatePresence>
      {open && file ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
          <motion.button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 cursor-pointer bg-ink/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${file.original_name}`}
            className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-line bg-surface shadow-[var(--shadow-panel)]"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-accent">
                  Preview
                </p>
                <h2 className="mt-1 truncate font-display text-lg font-bold text-ink">
                  {file.original_name}
                </h2>
                <p className="mt-0.5 text-xs text-muted">{formatBytes(file.size_bytes)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Download"
                  onClick={() => onDownload(file)}
                >
                  <FiDownload size={16} aria-hidden />
                </Button>
                <Button type="button" variant="secondary" size="icon" aria-label="Close" onClick={onClose}>
                  <FiX size={16} aria-hidden />
                </Button>
              </div>
            </div>

            <div className="min-h-[280px] flex-1 overflow-auto bg-bg-elevated/40 p-4">
              {loading ? (
                <div className="grid h-full min-h-[280px] place-items-center text-sm text-muted">
                  Loading preview…
                </div>
              ) : error ? (
                <div className="grid h-full min-h-[280px] place-items-center gap-3 text-center">
                  <p className="m-0 text-sm text-danger">{error}</p>
                  <Button type="button" onClick={() => onDownload(file)}>
                    Download instead
                  </Button>
                </div>
              ) : kind === 'image' && objectUrl ? (
                <div className="grid min-h-[280px] place-items-center">
                  <img
                    src={objectUrl}
                    alt={file.original_name}
                    className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-sm"
                  />
                </div>
              ) : kind === 'pdf' && objectUrl ? (
                <iframe
                  title={file.original_name}
                  src={objectUrl}
                  className="h-[70vh] w-full rounded-xl border border-line bg-surface"
                />
              ) : kind === 'text' && textContent !== null ? (
                <pre className="m-0 overflow-auto rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed text-ink whitespace-pre-wrap">
                  {textContent}
                </pre>
              ) : kind === 'docx' && docxHtml ? (
                <div
                  className={cn(
                    'prose prose-sm max-w-none rounded-xl border border-line bg-surface p-5 text-ink',
                    '[&_img]:max-w-full [&_p]:my-2 [&_h1]:text-xl [&_h2]:text-lg',
                  )}
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              ) : (
                <div className="grid h-full min-h-[280px] place-items-center gap-3 text-center">
                  <p className="m-0 text-sm text-muted">
                    Preview isn’t available for this file type.
                  </p>
                  <Button type="button" onClick={() => onDownload(file)}>
                    Download file
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
