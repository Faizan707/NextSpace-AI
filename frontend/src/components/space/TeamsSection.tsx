import { Button } from '../ui'
import type { SpaceTeam } from '../../types'
import { TeamCard } from './TeamCard'

interface TeamsSectionProps {
  teams: SpaceTeam[]
  canManageTeam?: (team: SpaceTeam) => boolean
  onCreate: () => void
  onAddMembers: (team: SpaceTeam) => void
  onDelete: (team: SpaceTeam) => void
}

export function TeamsSection({
  teams,
  canManageTeam,
  onCreate,
  onAddMembers,
  onDelete,
}: TeamsSectionProps) {
  return (
    <section className="fade-up-delay">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Teams</h2>
          <p className="text-sm text-muted">Group space members for collaboration.</p>
        </div>
        <Button type="button" onClick={onCreate}>
          Create team
        </Button>
      </div>
      {teams.length === 0 ? (
        <div className="rounded-[36px] border border-dashed border-accent/25 bg-accent-soft/40 px-4 py-14 text-center">
          <p className="font-display text-lg text-ink">No teams yet</p>
          <p className="mt-1 text-sm text-muted">Create a team to organize collaborators.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              canManage={canManageTeam?.(team) ?? false}
              onAddMembers={onAddMembers}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
