import { Button } from '../ui'
import type { SpaceDocument } from '../../types'
import { DocumentCard } from './DocumentCard'

interface DocumentsSectionProps {
  documents: SpaceDocument[]
  onUpload: () => void
  onPreview: (document: SpaceDocument) => void
  onDownload: (document: SpaceDocument) => void
  onDelete: (document: SpaceDocument) => void
}

export function DocumentsSection({
  documents,
  onUpload,
  onPreview,
  onDownload,
  onDelete,
}: DocumentsSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Documents</h2>
          <p className="text-sm text-muted">Upload and share files with space members.</p>
        </div>
        <Button type="button" onClick={onUpload}>
          Upload document
        </Button>
      </div>
      {documents.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-line bg-surface-2 px-4 py-14 text-center">
          <p className="font-display text-lg text-ink">No documents yet</p>
          <p className="mt-1 text-sm text-muted">Upload a file to share with this space.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onUploadAnother={onUpload}
              onPreview={onPreview}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
