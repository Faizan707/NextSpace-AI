import { Avatar } from '../Avatar'
import { Button } from '../ui'
import type { SpaceDocument } from '../../types'
import { formatBytes, formatDate } from './format'
import { DownloadIcon, FileIcon, PlusIcon, TrashIcon } from './icons'

interface DocumentCardProps {
  document: SpaceDocument
  onUploadAnother: () => void
  onDownload: (document: SpaceDocument) => void
  onDelete: (document: SpaceDocument) => void
}

export function DocumentCard({
  document,
  onUploadAnother,
  onDownload,
  onDelete,
}: DocumentCardProps) {
  const uploadedLabel = formatDate(document.created_at) || 'recently'

  return (
    <article className="relative flex h-[280px] w-[250px] flex-col overflow-hidden rounded-[18px] border border-line bg-surface shadow-sm transition hover:border-ink/20 hover:shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
        <span className="grid size-10 place-items-center rounded-xl bg-ink text-ink-on-accent">
          <FileIcon />
        </span>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted">Document</p>
          <p className="truncate text-xs font-semibold text-ink">{formatBytes(document.size_bytes)}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="m-0 line-clamp-2 font-display text-[1.05rem] leading-snug text-ink">
          {document.original_name}
        </h3>
        <p className="mt-2 m-0 line-clamp-2 flex-1 text-sm text-muted">
          Uploaded {uploadedLabel}
          {document.content_type ? ` · ${document.content_type.split('/').pop()}` : ''}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-line pt-3">
          <div className="flex items-center">
            <Avatar
              name={document.uploaded_by.full_name}
              email={document.uploaded_by.email}
              imageUrl={document.uploaded_by.avatar_url}
              title={document.uploaded_by.full_name || document.uploaded_by.email}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="ml-[-6px] border-dashed"
              aria-label="Upload another"
              title="Upload another"
              onClick={onUploadAnother}
            >
              <PlusIcon />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => onDownload(document)}
              aria-label={`Download ${document.original_name}`}
              title="Download"
            >
              <DownloadIcon />
            </Button>
            <Button
              type="button"
              variant="danger"
              size="icon"
              onClick={() => onDelete(document)}
              aria-label={`Delete ${document.original_name}`}
              title="Delete"
            >
              <TrashIcon />
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
