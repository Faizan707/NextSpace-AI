import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddSpaceMembersDrawer } from '../components/AddSpaceMembersDrawer'
import { Avatar } from '../components/Avatar'
import { SpaceDrawer } from '../components/SpaceDrawer'
import { Alert, Button, SpaceCardsSkeleton } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import { useSpaceStore } from '../stores/spaceStore'
import type { Space, SpacePayload } from '../types'
import { cn } from '../lib/cn'

function badgeClass(type: Space['space_type']) {
  if (type === 'public') return 'bg-accent-soft text-accent'
  if (type === 'specific') return 'bg-bg-elevated text-muted'
  return 'bg-teal-soft text-teal'
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Zm11.1-13.4 2.3 2.3 1.6-1.6-2.3-2.3-1.6 1.6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 21a2 2 0 0 1-2-2V7H4V5h4V4h8v1h4v2h-1v12a2 2 0 0 1-2 2H7Zm2-4h2V9H9v8Zm4 0h2V9h-2v8Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
    </svg>
  )
}

export function SpacesPage() {
  const navigate = useNavigate()
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
    if (editing) {
      await updateSpace(editing.id, payload)
    } else {
      await createSpace(payload)
    }
    setDrawerOpen(false)
    setEditing(null)
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
          {spaces.map((space) => {
            const memberPreview = (space.members?.length ? space.members : [space.created_by]).slice(
              0,
              3,
            )
            const extraCount = Math.max((space.members?.length || 1) - memberPreview.length, 0)
            const manage = canManage(space)

            return (
              <article
                key={space.id}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/app/spaces/${space.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/app/spaces/${space.id}`)
                  }
                }}
                className="relative flex h-[280px] w-[250px] cursor-pointer flex-col rounded-[22px] border border-line bg-surface p-5 shadow-sm transition hover:border-accent/25 hover:shadow-[var(--shadow-panel)]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="m-0 truncate font-display text-lg text-ink">{space.name}</h3>
                    <span
                      className={cn(
                        'mt-2 inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.02em]',
                        badgeClass(space.space_type),
                      )}
                    >
                      {space.space_type}
                    </span>
                  </div>
                  {manage ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation()
                        openEdit(space)
                      }}
                      aria-label={`Edit ${space.name}`}
                      title="Edit"
                    >
                      <PencilIcon />
                    </Button>
                  ) : null}
                </div>

                <p className="m-0 line-clamp-3 flex-1 text-sm text-muted">
                  {space.description || 'No description'}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <div className="flex items-center">
                    {memberPreview.map((member, index) => (
                      <Avatar
                        key={member.id}
                        name={member.full_name}
                        email={member.email}
                        imageUrl={member.avatar_url}
                        title={member.full_name || member.email}
                        className={index === 0 ? undefined : 'ml-[-6px]'}
                      />
                    ))}
                    {extraCount > 0 ? (
                      <span className="ml-[-6px] grid size-9 place-items-center rounded-full bg-bg-elevated text-[0.7rem] font-bold text-muted ring-2 ring-surface">
                        +{extraCount}
                      </span>
                    ) : null}
                    {manage ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="ml-[-6px] border-dashed"
                        aria-label="Add member"
                        title="Add member"
                        onClick={(event) => {
                          event.stopPropagation()
                          setMembersSpace(space)
                        }}
                      >
                        <PlusIcon />
                      </Button>
                    ) : null}
                  </div>

                  {manage ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation()
                        void deleteSpace(space.id)
                      }}
                      aria-label={`Delete ${space.name}`}
                      title="Delete"
                    >
                      <TrashIcon />
                    </Button>
                  ) : null}
                </div>
              </article>
            )
          })}
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
