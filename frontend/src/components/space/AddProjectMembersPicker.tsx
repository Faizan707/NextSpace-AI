import { useState } from 'react'
import { Avatar } from '../Avatar'
import type { SpaceCreator, SpaceTeam } from '../../types'
import { cn } from '../../lib/cn'

type AddTab = 'people' | 'teams'

type AddProjectMembersPickerProps = {
  people: SpaceCreator[]
  teams: SpaceTeam[]
  existingMemberIds: ReadonlySet<number>
  selectedPeople: Set<number>
  selectedTeams: Set<number>
  onTogglePerson: (userId: number) => void
  onToggleTeam: (teamId: number) => void
}

export function AddProjectMembersPicker({
  people,
  teams,
  existingMemberIds,
  selectedPeople,
  selectedTeams,
  onTogglePerson,
  onToggleTeam,
}: AddProjectMembersPickerProps) {
  const [tab, setTab] = useState<AddTab>('people')

  const peopleCandidates = people.filter((member) => !existingMemberIds.has(member.id))

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setTab('people')}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            tab === 'people'
              ? 'bg-surface text-ink shadow-sm'
              : 'text-muted hover:text-ink',
          )}
        >
          People
          {selectedPeople.size > 0 ? ` (${selectedPeople.size})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setTab('teams')}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            tab === 'teams'
              ? 'bg-surface text-ink shadow-sm'
              : 'text-muted hover:text-ink',
          )}
        >
          Teams
          {selectedTeams.size > 0 ? ` (${selectedTeams.size})` : ''}
        </button>
      </div>

      {tab === 'people' ? (
        peopleCandidates.length === 0 ? (
          <p className="text-sm text-muted">
            Everyone in this space is already on the project.
          </p>
        ) : (
          <ul className="space-y-2">
            {peopleCandidates.map((member) => {
              const checked = selectedPeople.has(member.id)
              return (
                <li key={member.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3 transition',
                      checked && 'border-accent/40 bg-accent-soft',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onTogglePerson(member.id)}
                      className="size-4 accent-[var(--color-accent)]"
                    />
                    <Avatar
                      name={member.full_name}
                      email={member.email}
                      imageUrl={member.avatar_url}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {member.full_name || 'Unnamed'}
                      </span>
                      <span className="block truncate text-xs text-muted">{member.email}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted">No teams in this space yet.</p>
      ) : (
        <ul className="space-y-2">
          {teams.map((team) => {
            const checked = selectedTeams.has(team.id)
            const memberIds = team.members.map((member) => member.id)
            const newCount = memberIds.filter((id) => !existingMemberIds.has(id)).length
            const alreadyCount = memberIds.length - newCount
            const disabled = newCount === 0

            return (
              <li key={team.id}>
                <label
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3 transition',
                    disabled
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer',
                    checked && !disabled && 'border-accent/40 bg-accent-soft',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked && !disabled}
                    disabled={disabled}
                    onChange={() => onToggleTeam(team.id)}
                    className="mt-1 size-4 accent-[var(--color-accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {team.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {memberIds.length === 0
                        ? 'No members'
                        : disabled
                          ? `All ${alreadyCount} already on project`
                          : alreadyCount > 0
                            ? `${newCount} new · ${alreadyCount} already on project`
                            : `${newCount} member${newCount === 1 ? '' : 's'} to add`}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function countProjectAddSelection(
  selectedPeople: ReadonlySet<number>,
  selectedTeams: ReadonlySet<number>,
  teams: SpaceTeam[],
  existingMemberIds: ReadonlySet<number>,
) {
  const ids = new Set(selectedPeople)
  for (const team of teams) {
    if (!selectedTeams.has(team.id)) continue
    for (const member of team.members) {
      if (!existingMemberIds.has(member.id)) ids.add(member.id)
    }
  }
  return ids.size
}
