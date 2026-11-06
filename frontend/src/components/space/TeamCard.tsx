import { Button } from '../ui'
import type { SpaceTeam } from '../../types'
import { TrashIcon } from './icons'
import { MemberStack } from './MemberStack'

interface TeamCardProps {
  team: SpaceTeam
  onAddMembers: (team: SpaceTeam) => void
  onDelete: (team: SpaceTeam) => void
}

export function TeamCard({ team, onAddMembers, onDelete }: TeamCardProps) {
  const people = team.members.length > 0 ? team.members : [team.created_by]

  return (
    <article className="relative flex h-[280px] w-[250px] flex-col rounded-[28px] border border-teal/15 bg-[linear-gradient(165deg,#faf9ff_0%,#ffffff_45%,#f5f3ff_100%)] p-5 shadow-sm transition hover:border-teal/35 hover:shadow-[0_16px_40px_rgba(124,108,240,0.12)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-teal" />
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-teal">Team</p>
          </div>
          <h3 className="mt-2 m-0 truncate font-display text-lg text-ink">{team.name}</h3>
          <span className="mt-2 inline-flex rounded-full bg-teal-soft px-2.5 py-1 text-[0.72rem] font-semibold text-teal">
            {people.length} member{people.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <p className="m-0 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
        {team.description || 'No description'}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface/80 px-3 py-3 ring-1 ring-teal/10">
        <MemberStack
          people={people}
          addLabel="Add member"
          ringClassName="ring-[color-mix(in_srgb,var(--color-teal-soft)_80%,white)]"
          onAdd={() => onAddMembers(team)}
        />
        <Button
          type="button"
          variant="danger"
          size="icon"
          onClick={() => onDelete(team)}
          aria-label={`Delete ${team.name}`}
          title="Delete"
        >
          <TrashIcon />
        </Button>
      </div>
    </article>
  )
}
