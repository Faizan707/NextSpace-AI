import { Avatar } from '../Avatar'
import { Button, ContextMenu } from '../ui'
import type { ProjectStatus, SpaceProject } from '../../types'
import { formatDate } from './format'
import { CalendarIcon, MoreIcon, PlusIcon, ProgressIcon } from './icons'
import { cn } from '../../lib/cn'

interface ProjectCardProps {
  project: SpaceProject
  canManage?: boolean
  onOpen: (project: SpaceProject) => void
  onEdit: (project: SpaceProject) => void
  onAddMembers: (project: SpaceProject) => void
  onDelete: (project: SpaceProject) => void
}

function statusMeta(status: ProjectStatus, deadline: string | null) {
  const overdue =
    status !== 'completed' &&
    Boolean(deadline) &&
    !Number.isNaN(new Date(deadline || '').getTime()) &&
    new Date(deadline || '').getTime() < Date.now()

  if (overdue) {
    return {
      label: 'Overdue',
      className: 'bg-danger-soft text-danger',
      dotClassName: 'bg-danger',
    }
  }
  if (status === 'completed') {
    return {
      label: 'Completed',
      className: 'bg-accent-soft text-accent',
      dotClassName: 'bg-accent',
    }
  }
  if (status === 'in_progress') {
    return {
      label: 'In Progress',
      className: 'bg-teal-soft text-teal',
      dotClassName: 'bg-teal',
    }
  }
  return {
    label: 'Open',
    className: 'bg-bg-elevated text-muted',
    dotClassName: 'bg-muted',
  }
}

export function ProjectCard({
  project,
  canManage = false,
  onOpen,
  onEdit,
  onAddMembers,
  onDelete,
}: ProjectCardProps) {
  const createdLabel = formatDate(project.created_at) || '—'
  const deadlineLabel = formatDate(project.deadline) || 'Not set'
  const people = project.members?.length > 0 ? project.members : [project.created_by]
  const preview = people.slice(0, 3)
  const extraCount = Math.max(people.length - preview.length, 0)
  const memberLabel = `${people.length} member${people.length === 1 ? '' : 's'}`
  const status = statusMeta(project.status, project.deadline)
  const progress = Math.max(0, Math.min(100, project.progress ?? 0))
  const menuItems = canManage
    ? [
        {
          id: 'edit',
          label: 'Edit',
          onSelect: () => onEdit(project),
        },
        {
          id: 'add-members',
          label: 'Add members',
          onSelect: () => onAddMembers(project),
        },
        {
          id: 'delete',
          label: 'Delete',
          danger: true,
          onSelect: () => onDelete(project),
        },
      ]
    : []

  return (
    <article className="relative flex w-[320px] flex-col rounded-[24px] border border-line bg-surface p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:shadow-[var(--shadow-panel)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold',
              status.className,
            )}
          >
            <span className={cn('size-1.5 rounded-full', status.dotClassName)} />
            {status.label}
          </span>
          <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-[0.72rem] font-bold text-accent">
            {memberLabel}
          </span>
        </div>

        {menuItems.length > 0 ? (
          <ContextMenu
            align="end"
            trigger={({ open, props }) => (
              <button
                {...props}
                aria-label={`Project actions for ${project.name}`}
                className={cn(
                  'grid size-8 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink',
                  open && 'bg-surface-2 text-ink',
                )}
              >
                <MoreIcon />
              </button>
            )}
            items={menuItems}
          />
        ) : null}
      </div>

      <h3 className="mt-4 m-0 line-clamp-2 font-display text-[1.35rem] font-bold leading-tight text-teal">
        {project.name}
      </h3>
      <p className="mt-2 m-0 line-clamp-3 min-h-[4.5rem] text-sm leading-relaxed text-muted">
        {project.description || 'No description'}
      </p>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl bg-surface-2">
        <div className="px-3.5 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted">Created at</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <span className="text-muted">
              <CalendarIcon />
            </span>
            {createdLabel}
          </p>
        </div>
        <div className="border-l border-line px-3.5 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted">Deadline</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <span className="text-muted">
              <CalendarIcon />
            </span>
            {deadlineLabel}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-muted">
            <ProgressIcon />
            Progress
          </span>
          <span className="font-bold text-ink">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-teal transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center">
          {preview.map((person, index) => (
            <Avatar
              key={person.id}
              name={person.full_name}
              email={person.email}
              imageUrl={person.avatar_url}
              title={person.full_name || person.email}
              className={index === 0 ? undefined : 'ml-[-8px]'}
            />
          ))}
          {extraCount > 0 ? (
            <span className="ml-[-8px] grid size-9 place-items-center rounded-full bg-bg-elevated text-[0.7rem] font-bold text-muted ring-2 ring-surface">
              +{extraCount}
            </span>
          ) : null}
          {canManage ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="ml-[-8px] border-dashed"
              aria-label="Add member"
              title="Add member"
              onClick={() => onAddMembers(project)}
            >
              <PlusIcon />
            </Button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onOpen(project)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2.5 text-sm font-semibold text-ink-on-accent transition hover:bg-ink/90"
        >
          Details
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  )
}
