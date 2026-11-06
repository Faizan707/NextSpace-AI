import { FiClock, FiDownload, FiEye } from 'react-icons/fi'
import { Avatar } from '../Avatar'
import { ContextMenu } from '../ui'
import type { SpaceDocument } from '../../types'
import { formatBytes, formatDate } from './format'
import { MoreIcon, PlusIcon } from './icons'
import { cn } from '../../lib/cn'

interface DocumentCardProps {
  document: SpaceDocument
  onUploadAnother: () => void
  onPreview: (document: SpaceDocument) => void
  onDownload: (document: SpaceDocument) => void
  onDelete: (document: SpaceDocument) => void
}

function fileMeta(name: string, contentType: string | null) {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  const type = (contentType || '').toLowerCase()

  if (ext === 'pdf' || type.includes('pdf')) {
    return {
      letter: 'P',
      label: 'pdf',
      iconClass: 'bg-[#B91C1C] text-white',
      badgeClass: 'bg-danger-soft text-danger',
    }
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || type.includes('spreadsheet') || type.includes('excel')) {
    return {
      letter: 'X',
      label: ext || 'xlsx',
      iconClass: 'bg-[#15803D] text-white',
      badgeClass: 'bg-teal-soft text-teal',
    }
  }
  if (['ppt', 'pptx'].includes(ext) || type.includes('presentation')) {
    return {
      letter: 'P',
      label: ext || 'pptx',
      iconClass: 'bg-[#C2410C] text-white',
      badgeClass: 'bg-[#FFF1E8] text-[#C2410C]',
    }
  }
  if (['doc', 'docx'].includes(ext) || type.includes('word') || type.includes('msword')) {
    return {
      letter: 'W',
      label: ext || 'docx',
      iconClass: 'bg-[#1e2a44] text-white',
      badgeClass: 'bg-accent-soft text-accent',
    }
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || type.startsWith('image/')) {
    return {
      letter: 'I',
      label: ext || 'img',
      iconClass: 'bg-[#6D28D9] text-white',
      badgeClass: 'bg-[#F3E8FF] text-[#6D28D9]',
    }
  }

  return {
    letter: (ext || 'F').slice(0, 1).toUpperCase(),
    label: ext || 'file',
    iconClass: 'bg-ink text-ink-on-accent',
    badgeClass: 'bg-bg-elevated text-muted',
  }
}

function displayTitle(name: string) {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return name
  return name.slice(0, dot)
}

export function DocumentCard({
  document,
  onUploadAnother,
  onPreview,
  onDownload,
  onDelete,
}: DocumentCardProps) {
  const uploadedLabel = formatDate(document.created_at) || 'recently'
  const meta = fileMeta(document.original_name, document.content_type)
  const title = displayTitle(document.original_name)

  return (
    <article className="relative flex h-[300px] w-[320px] flex-col rounded-[24px] border border-line bg-surface p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:shadow-[var(--shadow-panel)]">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold',
            meta.iconClass,
          )}
        >
          {meta.letter}
        </span>

        <div className="min-w-0 flex-1">
          <p className="m-0 flex flex-wrap items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-muted">
            <span>Document</span>
            <span className="text-placeholder">•</span>
            <span className="normal-case tracking-normal">{formatBytes(document.size_bytes)}</span>
          </p>
          <span
            className={cn(
              'mt-1.5 inline-flex rounded-lg px-2 py-1 text-[0.7rem] font-semibold uppercase',
              meta.badgeClass,
            )}
          >
            {meta.label}
          </span>
        </div>

        <ContextMenu
          align="end"
          trigger={({ open, props }) => (
            <button
              {...props}
              aria-label={`Document actions for ${document.original_name}`}
              className={cn(
                'grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-bg-elevated text-muted transition hover:bg-surface-2 hover:text-ink',
                open && 'bg-surface-2 text-ink',
              )}
            >
              <MoreIcon />
            </button>
          )}
          items={[
            {
              id: 'preview',
              label: 'Preview',
              onSelect: () => onPreview(document),
            },
            {
              id: 'download',
              label: 'Download',
              onSelect: () => onDownload(document),
            },
            {
              id: 'delete',
              label: 'Delete',
              danger: true,
              onSelect: () => onDelete(document),
            },
          ]}
        />
      </div>

      <div className="mt-5 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onPreview(document)}
          className="m-0 cursor-pointer break-words text-left font-display text-base font-bold leading-snug tracking-tight text-ink transition hover:text-accent"
          title={`Preview ${document.original_name}`}
        >
          {title}
        </button>
        <p className="mt-2 m-0 flex items-center gap-1.5 text-sm text-muted">
          <FiClock size={14} className="shrink-0 text-accent/70" aria-hidden />
          Uploaded {uploadedLabel}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex items-center">
          <Avatar
            name={document.uploaded_by.full_name}
            email={document.uploaded_by.email}
            imageUrl={document.uploaded_by.avatar_url}
            title={document.uploaded_by.full_name || document.uploaded_by.email}
            className="ring-2 ring-surface"
          />
          <button
            type="button"
            title="Upload another"
            aria-label="Upload another document"
            onClick={onUploadAnother}
            className="ml-[-8px] grid size-9 cursor-pointer place-items-center rounded-full border-2 border-dashed border-line bg-surface text-muted transition hover:z-10 hover:border-accent hover:text-accent active:scale-95"
          >
            <PlusIcon />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Preview"
            aria-label={`Preview ${document.original_name}`}
            onClick={() => onPreview(document)}
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-accent-soft text-accent transition hover:bg-accent hover:text-ink-on-accent active:scale-95"
          >
            <FiEye size={15} aria-hidden />
          </button>
          <button
            type="button"
            title="Download"
            aria-label={`Download ${document.original_name}`}
            onClick={() => onDownload(document)}
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-bg-elevated text-muted transition hover:bg-surface-2 hover:text-ink active:scale-95"
          >
            <FiDownload size={15} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  )
}
