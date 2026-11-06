import { useState } from 'react'
import { AddSpaceMembersDrawer } from '../components/AddSpaceMembersDrawer'
import { SpaceCard } from '../components/SpaceCard'
import { SpaceDrawer } from '../components/SpaceDrawer'
import { Alert, Button, SpaceCardsSkeleton } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import { useSpaceStore } from '../stores/spaceStore'
import { toast } from '../stores/toastStore'
import type { Space, SpacePayload } from '../types'

export function SpacesPage() {
  const user = useAuthStore((s) => s.user)
  const spaces = useSpaceStore((s) => s.spaces)
  const spaceLoading = useSpaceStore((s) => s.loading)
  const spaceError = useSpaceStore((s) => s.error)
  const createSpace = useSpaceStore((s) => s.createSpace)
  const updateSpace = useSpaceStore((s) => s.updateSpace)
  const deleteSpace = useSpaceStore((s) => s.deleteSpace)
  const addMembers = useSpaceStore((s) => s.addMembers)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Space | null>(null)
  const [membersSpace, setMembersSpace] = useState<Space | null>(null)

  function openCreate() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(space: Space) {
    setEditing(space)
    setDrawerOpen(true)
  }

  function canManage(space: Space) {
    return user?.role === 'tenant_owner' || space.created_by_id === user?.id
  }

  async function handleSave(payload: SpacePayload) {
    try {
      if (editing) {
        await updateSpace(editing.id, payload)
        toast.success('Space updated', payload.name)
      } else {
        await createSpace(payload)
        toast.success('Space created', payload.name)
      }
      setDrawerOpen(false)
      setEditing(null)
    } catch (err) {
      toast.error(
        editing ? 'Failed to update space' : 'Failed to create space',
        err instanceof Error ? err.message : undefined,
      )
    }
  }

  async function handleAddMembers(userIds: number[]) {
    if (!membersSpace) return
    await addMembers(membersSpace.id, userIds)
    setMembersSpace(null)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="fade-up mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Spaces</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">
            Team rooms
          </h1>
          <p className="mt-1 text-muted">
            You only see spaces you belong to. Add company members from the card to share access.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          New space
        </Button>
      </section>

      {spaceError ? <Alert className="mb-4">{spaceError}</Alert> : null}

      {spaceLoading && spaces.length === 0 ? (
        <SpaceCardsSkeleton count={4} />
      ) : spaces.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-line bg-surface px-4 py-14 text-center">
          <p className="font-display text-lg text-ink">No spaces yet</p>
          <p className="mt-1 text-sm text-muted">Create your first room to get started.</p>
          <Button type="button" className="mt-4" onClick={openCreate}>
            Create space
          </Button>
        </div>
      ) : (
        <div className="fade-up-delay flex flex-wrap gap-4">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              canManage={canManage(space)}
              onEdit={openEdit}
              onAddMembers={setMembersSpace}
              onDelete={(item) => void deleteSpace(item.id)}
            />
          ))}
        </div>
      )}

      <SpaceDrawer
        open={drawerOpen}
        title={editing ? 'Edit space' : 'Create space'}
        initial={editing}
        submitting={spaceLoading}
        onClose={() => {
          setDrawerOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSave}
      />

      <AddSpaceMembersDrawer
        open={Boolean(membersSpace)}
        space={membersSpace}
        submitting={spaceLoading}
        onClose={() => setMembersSpace(null)}
        onSubmit={handleAddMembers}
      />
    </div>
  )
}
