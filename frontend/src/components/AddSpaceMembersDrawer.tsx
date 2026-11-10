import { useEffect, useMemo, useState } from 'react'
import { useCompanyMembersQuery } from '../hooks'
import type { Space, SpaceCreator } from '../types'
import { Alert, Button, Drawer } from './ui'
import { Avatar } from './Avatar'
import { cn } from '../lib/cn'

interface AddSpaceMembersDrawerProps {
  open: boolean
  space: Space | null
  submitting?: boolean
  removingId?: number | null
  onClose: () => void
  onSubmit: (userIds: number[]) => Promise<void>
  onRemove?: (member: SpaceCreator) => Promise<void> | void
}

export function AddSpaceMembersDrawer({
  open,
  space,
  submitting,
  removingId = null,
  onClose,
  onSubmit,
  onRemove,
}: AddSpaceMembersDrawerProps) {
  const membersQuery = useCompanyMembersQuery(open)
  const members = membersQuery.data ?? []
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const existingMembers = useMemo(() => {
    if (space?.members?.length) return space.members
    return space?.created_by ? [space.created_by] : []
  }, [space])

  const existingIds = useMemo(
    () => new Set(existingMembers.map((member) => member.id)),
    [existingMembers],
  )

  const candidates = useMemo(
    () => members.filter((member) => !existingIds.has(member.id)),
    [members, existingIds],
  )

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
  }, [open, space?.id])

  function toggle(userId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleAdd() {
    if (selected.size === 0) return
    await onSubmit([...selected])
  }

  const error =
    membersQuery.error instanceof Error ? membersQuery.error.message : null
  const creatorId = space?.created_by_id ?? null
  const canRemove = Boolean(onRemove)

  return (
    <Drawer
      open={open}
      eyebrow="Space"
      title={space ? `Members · ${space.name}` : 'Members'}
      description="Current members stay listed here. Add company people below to share this space."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            className="flex-[1.3]"
            disabled={submitting || selected.size === 0}
            onClick={() => void handleAdd()}
          >
            {submitting ? 'Adding…' : `Add${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        {error ? <Alert>{error}</Alert> : null}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
            Current members
          </p>
          {existingMembers.length === 0 ? (
            <p className="text-sm text-muted">No members yet.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {existingMembers.map((member) => {
                const isCreator = member.id === creatorId
                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3"
                  >
                    <Avatar
                      name={member.full_name}
                      email={member.email}
                      imageUrl={member.avatar_url}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {member.full_name || 'Unnamed'}
                        {isCreator ? (
                          <span className="ml-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                            Owner
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted">{member.email}</span>
                    </span>
                    {canRemove && !isCreator ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={removingId === member.id || submitting}
                        onClick={() => void onRemove?.(member)}
                      >
                        {removingId === member.id ? '…' : 'Remove'}
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
            Add from company
          </p>
          {membersQuery.isLoading ? (
            <p className="text-sm text-muted">Loading company members…</p>
          ) : null}
          {!membersQuery.isLoading && candidates.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-4 py-8 text-center text-sm text-muted">
              All company members are already in this space.
            </p>
          ) : null}
          <div className="grid gap-2">
            {candidates.map((member) => {
              const checked = selected.has(member.id)
              return (
                <label
                  key={member.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3 transition',
                    checked && 'border-accent/40 bg-accent-soft',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(member.id)}
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
              )
            })}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
