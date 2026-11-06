import { useNavigate } from 'react-router-dom'
import { Avatar } from './Avatar'
import { ContextMenu } from './ui'
import type { Space } from '../types'
import { cn } from '../lib/cn'
import { formatDate } from './space/format'
import {
  CalendarIcon,
  ChatBubbleIcon,
  DocumentsIcon,
  GlobeIcon,
  MoreIcon,
  PlusIcon,
  ProjectsIcon,
  TeamsIcon,
} from './space/icons'

function badgeClass(type: Space['space_type']) {
  if (type === 'public') return 'bg-accent-soft text-accent'
  if (type === 'specific') return 'bg-bg-elevated text-muted'
  return 'bg-teal-soft text-teal'
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
  const members = space.members?.length ? space.members : [space.created_by]
  const memberPreview = members.slice(0, 3)
  const extraCount = Math.max(members.length - memberPreview.length, 0)
  const memberLabel = `${members.length} member${members.length === 1 ? '' : 's'}`
  const createdLabel = formatDate(space.created_at) || '—'
  const hasDescription = Boolean(space.description?.trim())

  const menuItems = [
    onEdit
      ? {
          id: 'edit',
          label: 'Edit',
          onSelect: () => onEdit(space),
        }
      : null,
    onAddMembers
      ? {
          id: 'add-members',
          label: 'Add members',
          onSelect: () => onAddMembers(space),
        }
      : null,
    onDelete
      ? {
          id: 'delete',
          label: 'Delete',
          danger: true,
          onSelect: () => onDelete(space),
        }
      : null,
  ].filter(Boolean) as {
    id: string
    label: string
    danger?: boolean
    onSelect: () => void
  }[]

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
      className="relative flex w-[320px] cursor-pointer flex-col rounded-[24px] border border-line bg-surface p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:shadow-[var(--shadow-panel)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="size-2.5 shrink-0 rounded-full bg-accent" />
          <h3 className="m-0 truncate font-display text-xl font-bold tracking-tight text-ink">
            {space.name}
          </h3>
        </div>

        {canManage && menuItems.length > 0 ? (
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <ContextMenu
              align="end"
              trigger={({ open, props }) => (
                <button
                  {...props}
                  aria-label={`Space actions for ${space.name}`}
                  className={cn(
                    'grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink',
                    open && 'bg-surface-2 text-ink',
                  )}
                >
                  <MoreIcon />
                </button>
              )}
              items={menuItems}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.02em]',
            badgeClass(space.space_type),
          )}
        >
          {space.space_type === 'public' ? <GlobeIcon /> : null}
          {space.space_type}
        </span>
        <span className="text-placeholder">•</span>
        <span className="text-[0.8rem] font-medium">{memberLabel}</span>
      </div>

      <div
        className={cn(
          'mt-4 flex min-h-[72px] items-center gap-2.5 rounded-2xl border border-dashed px-3.5 py-3',
          hasDescription
            ? 'border-line bg-surface-2/60 text-muted'
            : 'border-line bg-bg-elevated/70 text-placeholder',
        )}
      >
        {!hasDescription ? (
          <span className="shrink-0 text-placeholder">
            <ChatBubbleIcon />
          </span>
        ) : null}
        <p className="m-0 line-clamp-3 text-sm leading-relaxed">
          {hasDescription ? space.description : 'No description added yet'}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-bg-elevated/80 px-2.5 py-2.5">
          <p className="m-0 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-placeholder">
            Projects
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
            <span className="text-accent">
              <ProjectsIcon />
            </span>
            {space.projects_count ?? 0}
          </div>
        </div>
        <div className="rounded-xl bg-bg-elevated/80 px-2.5 py-2.5">
          <p className="m-0 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-placeholder">
            Teams
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
            <span className="text-accent">
              <TeamsIcon />
            </span>
            {space.teams_count ?? 0}
          </div>
        </div>
        <div className="rounded-xl bg-bg-elevated/80 px-2.5 py-2.5">
          <p className="m-0 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-placeholder">
            Docs
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
            <span className="text-accent">
              <DocumentsIcon />
            </span>
            {space.documents_count ?? 0}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-bg-elevated/80 px-3.5 py-3">
        <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-placeholder">
          Created at
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="text-accent">
            <CalendarIcon />
          </span>
          {createdLabel}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex items-center">
          {memberPreview.map((member, index) => (
            <Avatar
              key={member.id}
              name={member.full_name}
              email={member.email}
              imageUrl={member.avatar_url}
              title={member.full_name || member.email}
              className={cn(index === 0 ? undefined : 'ml-[-8px]', 'ring-2 ring-surface')}
            />
          ))}
          {extraCount > 0 ? (
            <span className="ml-[-8px] grid size-9 place-items-center rounded-full bg-bg-elevated text-[0.7rem] font-bold text-muted ring-2 ring-surface">
              +{extraCount}
            </span>
          ) : null}
          {canManage && onAddMembers ? (
            <button
              type="button"
              title="Add member"
              aria-label={`Add member to ${space.name}`}
              onClick={(event) => {
                event.stopPropagation()
                onAddMembers(space)
              }}
              className="ml-[-8px] grid size-9 cursor-pointer place-items-center rounded-full border-2 border-dashed border-line bg-surface text-muted transition hover:z-10 hover:border-accent hover:text-accent active:scale-95"
            >
              <PlusIcon />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
