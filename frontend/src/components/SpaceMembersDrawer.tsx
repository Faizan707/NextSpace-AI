import { Avatar } from './Avatar'
import { Button, Drawer } from './ui'
import type { SpaceCreator } from '../types'
import { cn } from '../lib/cn'

interface SpaceMembersDrawerProps {
  open: boolean
  spaceName: string
  members: SpaceCreator[]
  selectedId?: number | null
  canManage?: boolean
  creatorId?: number | null
  removingId?: number | null
  onSelect?: (member: SpaceCreator) => void
  onRemove?: (member: SpaceCreator) => void
  onClose: () => void
}

export function SpaceMembersDrawer({
  open,
  spaceName,
  members,
  selectedId,
  canManage = false,
  creatorId = null,
  removingId = null,
  onSelect,
  onRemove,
  onClose,
}: SpaceMembersDrawerProps) {
  const selected = members.find((member) => member.id === selectedId) || members[0] || null

  return (
    <Drawer
      open={open}
      eyebrow="Members"
      title={spaceName}
      description={`${members.length} member${members.length === 1 ? '' : 's'} in this space`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {selected ? (
          <div className="rounded-2xl border border-line bg-bg-elevated/70 p-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={selected.full_name}
                email={selected.email}
                imageUrl={selected.avatar_url}
                className="size-12 text-base"
              />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate font-display text-lg font-bold text-ink">
                  {selected.full_name || 'Unnamed member'}
                </p>
                <p className="m-0 truncate text-sm text-muted">{selected.email}</p>
              </div>
            </div>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-placeholder">
                  Job role
                </dt>
                <dd className="mt-1 m-0 text-sm font-semibold text-ink">
                  {selected.job_role || 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-placeholder">
                  Email
                </dt>
                <dd className="mt-1 m-0 break-all text-sm font-semibold text-ink">{selected.email}</dd>
              </div>
            </dl>
            {canManage && selected.id !== creatorId && onRemove ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-4 w-full"
                disabled={removingId === selected.id}
                onClick={() => onRemove(selected)}
              >
                {removingId === selected.id ? 'Removing…' : 'Remove from space'}
              </Button>
            ) : null}
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">All members</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {members.map((member) => {
              const active = member.id === selected?.id
              const isCreator = member.id === creatorId
              return (
                <li key={member.id}>
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition',
                      active
                        ? 'border-accent/30 bg-accent-soft/50'
                        : 'border-line bg-surface hover:border-accent/20 hover:bg-bg-elevated/60',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect?.(member)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <Avatar
                        name={member.full_name}
                        email={member.email}
                        imageUrl={member.avatar_url}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold text-ink">
                          {member.full_name || 'Unnamed member'}
                          {isCreator ? (
                            <span className="ml-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                              Owner
                            </span>
                          ) : null}
                        </p>
                        <p className="m-0 truncate text-xs text-muted">
                          {member.job_role || member.email}
                        </p>
                      </div>
                    </button>
                    {canManage && !isCreator && onRemove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={removingId === member.id}
                        onClick={() => onRemove(member)}
                      >
                        {removingId === member.id ? '…' : 'Remove'}
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </Drawer>
  )
}
