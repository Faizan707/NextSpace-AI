import { Button } from '../ui'
import type { SpaceTeam } from '../../types'
import { TeamCard } from './TeamCard'

interface TeamsSectionProps {
  teams: SpaceTeam[]
  onCreate: () => void
  onAddMembers: (team: SpaceTeam) => void
  onDelete: (team: SpaceTeam) => void
}

export function TeamsSection({ teams, onCreate, onAddMembers, onDelete }: TeamsSectionProps) {
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
        <div className="rounded-[24px] border border-dashed border-teal/30 bg-teal-soft/50 px-4 py-14 text-center">
          <p className="font-display text-lg text-ink">No teams yet</p>
          <p className="mt-1 text-sm text-muted">Create a team to organize collaborators.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onAddMembers={onAddMembers}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
