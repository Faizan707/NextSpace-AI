import { useNavigate } from 'react-router-dom'
import { Avatar } from './Avatar'
import { Button } from './ui'
import type { Space } from '../types'
import { cn } from '../lib/cn'

function badgeClass(type: Space['space_type']) {
  if (type === 'public') return 'bg-accent-soft text-accent'
  if (type === 'specific') return 'bg-bg-elevated text-muted'
  return 'bg-teal-soft text-teal'
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Zm11.1-13.4 2.3 2.3 1.6-1.6-2.3-2.3-1.6 1.6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 21a2 2 0 0 1-2-2V7H4V5h4V4h8v1h4v2h-1v12a2 2 0 0 1-2 2H7Zm2-4h2V9H9v8Zm4 0h2V9h-2v8Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
    </svg>
  )
}

interface SpaceCardProps {
  space: Space
  canManage?: boolean
  onEdit?: (space: Space) => void
  onAddMembers?: (space: Space) => void
  onDelete?: (space: Space) => void
}

export function SpaceCard({
  space,
  canManage = false,
  onEdit,
  onAddMembers,
  onDelete,
}: SpaceCardProps) {
  const navigate = useNavigate()
  const memberPreview = (space.members?.length ? space.members : [space.created_by]).slice(0, 3)
  const extraCount = Math.max((space.members?.length || 1) - memberPreview.length, 0)

  function openSpace() {
    navigate(`/app/spaces/${space.id}`)
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openSpace}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openSpace()
        }
      }}
      className="relative flex h-[280px] w-[250px] cursor-pointer flex-col rounded-[22px] border border-line bg-surface p-5 shadow-sm transition hover:border-accent/25 hover:shadow-[var(--shadow-panel)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 truncate font-display text-lg text-ink">{space.name}</h3>
          <span
            className={cn(
              'mt-2 inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.02em]',
              badgeClass(space.space_type),
            )}
          >
            {space.space_type}
          </span>
        </div>
        {canManage && onEdit ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(space)
            }}
            aria-label={`Edit ${space.name}`}
            title="Edit"
          >
            <PencilIcon />
          </Button>
        ) : null}
      </div>

      <p className="m-0 line-clamp-3 flex-1 text-sm text-muted">
        {space.description || 'No description'}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex items-center">
          {memberPreview.map((member, index) => (
            <Avatar
              key={member.id}
              name={member.full_name}
              email={member.email}
              imageUrl={member.avatar_url}
              title={member.full_name || member.email}
              className={index === 0 ? undefined : 'ml-[-6px]'}
            />
          ))}
          {extraCount > 0 ? (
            <span className="ml-[-6px] grid size-9 place-items-center rounded-full bg-bg-elevated text-[0.7rem] font-bold text-muted ring-2 ring-surface">
              +{extraCount}
            </span>
          ) : null}
          {canManage && onAddMembers ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="ml-[-6px] border-dashed"
              aria-label="Add member"
              title="Add member"
              onClick={(event) => {
                event.stopPropagation()
                onAddMembers(space)
              }}
            >
              <PlusIcon />
            </Button>
          ) : null}
        </div>

        {canManage && onDelete ? (
          <Button
            type="button"
            variant="danger"
            size="icon"
            onClick={(event) => {
              event.stopPropagation()
              onDelete(space)
            }}
            aria-label={`Delete ${space.name}`}
            title="Delete"
          >
            <TrashIcon />
          </Button>
        ) : null}
      </div>
    </article>
  )
}
