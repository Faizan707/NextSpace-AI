import { useEffect, useRef } from 'react'
import { FiShield } from 'react-icons/fi'
import { Button } from '../ui'
import type { DocumentComplianceFinding, SpaceDocument } from '../../types'
import { cn } from '../../lib/cn'

interface ComplianceFindingsDialogProps {
  open: boolean
  document: SpaceDocument | null
  onClose: () => void
}

function severityTone(severity: string) {
  switch (severity) {
    case 'high':
      return 'bg-danger-soft text-danger'
    case 'medium':
      return 'bg-[#FFF1E8] text-[#C2410C]'
    case 'low':
      return 'bg-accent-soft text-accent'
    default:
      return 'bg-bg-elevated text-muted'
  }
}

export function ComplianceFindingsDialog({
  open,
  document,
  onClose,
}: ComplianceFindingsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const findings: DocumentComplianceFinding[] = document?.compliance_findings ?? []

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
    const onDialogClose = () => {
      if (open) onClose()
    }
    node.addEventListener('close', onDialogClose)
    return () => node.removeEventListener('close', onDialogClose)
  }, [open, onClose])

  return (
    <dialog
      ref={ref}
      className="m-auto w-[min(460px,calc(100%-2rem))] overflow-hidden rounded-[20px] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-panel)]"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      <div className="px-5 pb-2 pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Compliance</p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-ink">
          Findings
        </h2>
        {document ? (
          <p className="mt-1 truncate text-sm text-muted" title={document.original_name}>
            {document.original_name}
          </p>
        ) : null}
        {document?.compliance_summary ? (
          <p className="mt-3 rounded-xl bg-bg-elevated px-3 py-2 text-sm text-ink">
            {document.compliance_summary}
            {typeof document.compliance_score === 'number'
              ? ` · Score ${document.compliance_score}`
              : ''}
          </p>
        ) : null}
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-5 py-3">
        {findings.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No detailed findings available.</p>
        ) : (
          <ul className="space-y-2.5">
            {findings.map((finding) => (
              <li
                key={`${finding.code}-${finding.message}`}
                className="rounded-2xl border border-line bg-surface-2 px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex rounded-lg px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide',
                      severityTone(finding.severity),
                    )}
                  >
                    {finding.severity}
                  </span>
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">
                    {finding.code.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink">{finding.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end border-t border-line px-5 py-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </dialog>
  )
}

export function hasComplianceFindings(document: SpaceDocument) {
  return Boolean(
    document.compliance_findings?.length ||
      (document.compliance_summary &&
        document.compliance_status &&
        document.compliance_status !== 'pending'),
  )
}

export function ComplianceSummaryButton({
  summary,
  onClick,
}: {
  summary: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 line-clamp-2 cursor-pointer text-left text-xs text-muted underline-offset-2 transition hover:text-accent hover:underline"
      title="View compliance findings"
    >
      <span className="inline-flex items-start gap-1">
        <FiShield size={12} className="mt-0.5 shrink-0" aria-hidden />
        <span>{summary}</span>
      </span>
    </button>
  )
}
