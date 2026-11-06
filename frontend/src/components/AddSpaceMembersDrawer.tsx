import { useEffect, useMemo, useState } from 'react'
import { useCompanyMembersQuery } from '../hooks'
import type { Space } from '../types'
import { Alert, Button, Drawer } from './ui'
import { Avatar } from './Avatar'
import { cn } from '../lib/cn'

interface AddSpaceMembersDrawerProps {
  open: boolean
  space: Space | null
  submitting?: boolean
  onClose: () => void
  onSubmit: (userIds: number[]) => Promise<void>
}

export function AddSpaceMembersDrawer({
  open,
  space,
  submitting,
  onClose,
  onSubmit,
}: AddSpaceMembersDrawerProps) {
  const membersQuery = useCompanyMembersQuery(open)
  const members = membersQuery.data ?? []
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const existingIds = useMemo(
    () => new Set((space?.members || []).map((member) => member.id)),
    [space],
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

  return (
    <Drawer
      open={open}
      eyebrow="Space"
      title={space ? `Add members · ${space.name}` : 'Add members'}
      description="Only company members you add here will see this space — including public ones."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-[1.3]"
            disabled={submitting || selected.size === 0}
            onClick={() => void handleAdd()}
          >
            {submitting ? 'Adding…' : `Add ${selected.size || ''}`.trim()}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        {error ? <Alert>{error}</Alert> : null}
        {membersQuery.isLoading ? (
          <p className="text-sm text-muted">Loading company members…</p>
        ) : null}
        {!membersQuery.isLoading && candidates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-4 py-8 text-center text-sm text-muted">
            All company members are already in this space.
          </p>
        ) : null}
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
    </Drawer>
  )
}
