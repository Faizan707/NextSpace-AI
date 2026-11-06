import { Avatar } from '../Avatar'
import { ContextMenu } from '../ui'
import type { SpaceTeam } from '../../types'
import { MoreIcon, PlusIcon } from './icons'
import { cn } from '../../lib/cn'

interface TeamCardProps {
  team: SpaceTeam
  onAddMembers: (team: SpaceTeam) => void
  onDelete: (team: SpaceTeam) => void
}

export function TeamCard({ team, onAddMembers, onDelete }: TeamCardProps) {
  const people = team.members.length > 0 ? team.members : [team.created_by]
  const preview = people.slice(0, 3)
  const extraCount = Math.max(people.length - preview.length, 0)
  const memberLabel = `${people.length} member${people.length === 1 ? '' : 's'}`

  return (
    <article
      className={cn(
        'group relative flex min-h-[340px] w-full max-w-[360px] flex-col justify-between rounded-[36px]',
        'border border-accent/15 bg-surface p-7',
        'shadow-[0_12px_35px_-8px_rgba(37,99,235,0.07),0_4px_16px_-2px_rgba(0,0,0,0.03)]',
        'transition-all duration-300',
        'hover:shadow-[0_22px_45px_-10px_rgba(37,99,235,0.14),0_8px_20px_-4px_rgba(0,0,0,0.05)]',
      )}
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-accent" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Team</span>
          </div>

          <ContextMenu
            align="end"
            trigger={({ open, props }) => (
              <button
                {...props}
                aria-label={`Team actions for ${team.name}`}
                className={cn(
                  'grid size-8 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink',
                  open && 'bg-surface-2 text-ink',
                )}
              >
                <MoreIcon />
              </button>
            )}
            items={[
              {
                id: 'add-members',
                label: 'Add members',
                onSelect: () => onAddMembers(team),
              },
              {
                id: 'delete',
                label: 'Delete',
                danger: true,
                onSelect: () => onDelete(team),
              },
            ]}
          />
        </div>

        <h3 className="m-0 line-clamp-2 font-display text-2xl font-bold tracking-tight text-ink">
          {team.name}
        </h3>

        <div className="mt-3 mb-5">
          <span className="inline-flex items-center rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent">
            {memberLabel}
          </span>
        </div>

        <p
          className={cn(
            'm-0 line-clamp-3 text-sm leading-relaxed',
            team.description ? 'text-muted' : 'font-medium text-placeholder',
          )}
        >
          {team.description || 'No description'}
        </p>
      </div>

      <div className="mt-6 flex items-center rounded-3xl border border-accent/10 bg-accent-soft/40 p-3">
        <div className="flex items-center p-0.5">
          {preview.map((person, index) => (
            <Avatar
              key={person.id}
              name={person.full_name}
              email={person.email}
              imageUrl={person.avatar_url}
              title={person.full_name || person.email}
              className={cn(
                'bg-accent-soft text-accent ring-2 ring-surface transition-transform hover:z-10 hover:scale-110',
                index === 0 ? undefined : 'ml-[-8px]',
              )}
            />
          ))}
          {extraCount > 0 ? (
            <span className="ml-[-8px] grid size-9 place-items-center rounded-full bg-bg-elevated text-[0.7rem] font-bold text-muted ring-2 ring-surface transition-transform hover:z-10 hover:scale-110">
              +{extraCount}
            </span>
          ) : null}
          <button
            type="button"
            title="Add member"
            aria-label={`Add member to ${team.name}`}
            onClick={() => onAddMembers(team)}
            className="ml-[-8px] grid size-9 cursor-pointer place-items-center rounded-full border-2 border-dashed border-line bg-surface text-muted shadow-sm transition hover:z-10 hover:scale-110 hover:border-accent hover:text-accent active:scale-95"
          >
            <PlusIcon />
          </button>
        </div>
      </div>
    </article>
  )
}
