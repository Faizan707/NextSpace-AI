import { useEffect, useMemo, useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import * as adminApi from '../../api/admin'
import type { AdminMember } from '../../api/admin'
import { EditMemberDrawer } from '../../components/EditMemberDrawer'
import { InviteUserDrawer } from '../../components/InviteUserDrawer'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Input,
  InviteListSkeleton,
} from '../../components/ui'
import type { BadgeTone, DataTableColumn } from '../../components/ui'
import { useAuthStore } from '../../stores/authStore'
import type { InviteCreateResult, InviteRecord } from '../../types'

function SearchIcon() {
  return <FiSearch size={16} aria-hidden />
}

function PlusIcon() {
  return <FiPlus size={14} aria-hidden />
}

function roleTone(role: string): BadgeTone {
  return role === 'tenant_owner' ? 'purple' : 'blue'
}

function roleLabel(role: string) {
  return role.replace('_', ' ')
}

export function AdminUsersPage() {
  const token = useAuthStore((s) => s.token)
  const currentUser = useAuthStore((s) => s.user)

  const [users, setUsers] = useState<AdminMember[]>([])
  const [invites, setInvites] = useState<InviteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastInvite, setLastInvite] = useState<InviteCreateResult | null>(null)

  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<AdminMember | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [revokingInviteId, setRevokingInviteId] = useState<number | null>(null)
  const [revokingUserId, setRevokingUserId] = useState<number | null>(null)

  async function load() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [overview, inviteList] = await Promise.all([
        adminApi.getOverview(token),
        adminApi.listInvites(token),
      ])
      setUsers(overview.users)
      setInvites(inviteList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === 'pending'),
    [invites],
  )

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) => {
      const name = user.full_name?.toLowerCase() || ''
      const email = user.email.toLowerCase()
      const jobRole = user.job_role?.toLowerCase() || ''
      return name.includes(q) || email.includes(q) || jobRole.includes(q)
    })
  }, [users, query])

  async function handleInvite(payload: {
    email: string
    full_name?: string
    job_role?: string
    send_password: boolean
  }) {
    if (!token) return
    setSubmitting(true)
    setDrawerError(null)
    setSuccess(null)
    setLastInvite(null)
    try {
      const result = await adminApi.createInvite(token, payload)
      setLastInvite(result)
      setSuccess(
        payload.send_password
          ? 'User created. Login credentials were emailed (preview below).'
          : 'Invite sent. They can sign up via the invite link.',
      )
      setDrawerOpen(false)
      await load()
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevokeInvite(invite: InviteRecord) {
    if (!token) return
    if (!window.confirm(`Revoke invite for ${invite.email}? The link will stop working.`)) return
    setRevokingInviteId(invite.id)
    setError(null)
    setSuccess(null)
    try {
      await adminApi.revokeInvite(token, invite.id)
      setSuccess(`Invite revoked for ${invite.email}.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite')
    } finally {
      setRevokingInviteId(null)
    }
  }

  async function handleEditMember(payload: {
    full_name?: string | null
    job_role?: string | null
  }) {
    if (!token || !editingMember) return
    setSubmitting(true)
    setEditError(null)
    setSuccess(null)
    try {
      await adminApi.updateUser(token, editingMember.id, payload)
      setSuccess(`Updated ${payload.full_name || editingMember.email}.`)
      setEditingMember(null)
      await load()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update member')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevokeUser(user: AdminMember) {
    if (!token) return
    if (
      !window.confirm(
        `Revoke access for ${user.full_name || user.email}? They will be removed from the organization.`,
      )
    ) {
      return
    }
    setRevokingUserId(user.id)
    setError(null)
    setSuccess(null)
    try {
      await adminApi.revokeUserAccess(token, user.id)
      setSuccess(`Access revoked for ${user.full_name || user.email}.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access')
    } finally {
      setRevokingUserId(null)
    }
  }

  const columns = useMemo<DataTableColumn<AdminMember>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        sortable: true,
        sortValue: (user) => user.full_name || '',
        cell: (user) => (
          <span className="font-medium text-ink">{user.full_name || '—'}</span>
        ),
      },
      {
        id: 'email',
        header: 'Email',
        sortable: true,
        sortValue: (user) => user.email,
        className: 'text-[#6b7280]',
        cell: (user) => user.email,
      },
      {
        id: 'job_role',
        header: 'Job role',
        sortable: true,
        sortValue: (user) => user.job_role || '',
        cell: (user) =>
          user.job_role ? (
            <span className="text-sm text-ink">{user.job_role}</span>
          ) : (
            <span className="text-sm text-muted">—</span>
          ),
      },
      {
        id: 'role',
        header: 'Access',
        sortable: true,
        sortValue: (user) => user.role,
        cell: (user) => (
          <Badge tone={roleTone(user.role)} className="capitalize">
            {roleLabel(user.role)}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Action',
        align: 'right',
        headerClassName: 'px-4',
        className: 'px-4',
        cell: (user) => {
          const canRevoke =
            user.role !== 'tenant_owner' && user.id !== currentUser?.id
          return (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-lg px-3 text-xs font-semibold"
                onClick={() => {
                  setEditError(null)
                  setEditingMember(user)
                }}
              >
                Edit
              </Button>
              {canRevoke ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-lg px-3 text-xs font-semibold text-danger hover:bg-danger-soft hover:text-danger"
                  disabled={revokingUserId === user.id}
                  onClick={() => void handleRevokeUser(user)}
                >
                  {revokingUserId === user.id ? 'Revoking…' : 'Revoke'}
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ],
    [currentUser?.id, revokingUserId],
  )

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <section className="fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Users</h1>
          <p className="mt-1 text-muted">
            {users.length} member{users.length === 1 ? '' : 's'}
            {pendingInvites.length > 0
              ? ` · ${pendingInvites.length} pending invite${pendingInvites.length === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>
        <Button type="button" onClick={() => setDrawerOpen(true)}>
          <PlusIcon />
          Invite member
        </Button>
      </section>

      {error ? <Alert>{error}</Alert> : null}
      {success ? (
        <div className="rounded-[var(--radius-control)] border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
          {success}
        </div>
      ) : null}

      {lastInvite?.temporary_password ? (
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink shadow-sm">
          <p className="font-semibold">Temporary password (dev preview)</p>
          <p className="mt-1 font-mono">{lastInvite.temporary_password}</p>
        </div>
      ) : null}
      {lastInvite?.invite_link ? (
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink shadow-sm">
          <p className="font-semibold">Invite link (dev preview)</p>
          <p className="mt-1 break-all font-mono text-accent">{lastInvite.invite_link}</p>
        </div>
      ) : null}

      {(loading && invites.length === 0) || pendingInvites.length > 0 ? (
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-ink">Pending invites</h2>
            {!loading ? (
              <span className="text-xs font-semibold text-muted">
                {pendingInvites.length} open
              </span>
            ) : null}
          </div>
          {loading && invites.length === 0 ? (
            <InviteListSkeleton count={3} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex min-w-[260px] flex-1 items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{invite.email}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {invite.job_role ? `${invite.job_role} · ` : ''}
                      {invite.send_password ? 'Password emailed' : 'Invite link only'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="blue">pending</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 rounded-lg px-3 text-xs font-semibold text-danger hover:bg-danger-soft hover:text-danger"
                      disabled={revokingInviteId === invite.id}
                      onClick={() => void handleRevokeInvite(invite)}
                    >
                      {revokingInviteId === invite.id ? '…' : 'Revoke'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="max-w-sm">
          <Input
            id="user-search"
            label="Search members"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
            leading={<SearchIcon />}
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredUsers}
          getRowId={(user) => user.id}
          loading={loading && users.length === 0}
          emptyMessage={query ? 'No members match your search.' : 'No members yet.'}
          defaultSortId="name"
        />
      </section>

      <InviteUserDrawer
        open={drawerOpen}
        submitting={submitting}
        error={drawerError}
        onClose={() => {
          setDrawerOpen(false)
          setDrawerError(null)
        }}
        onSubmit={handleInvite}
      />

      <EditMemberDrawer
        open={Boolean(editingMember)}
        member={editingMember}
        submitting={submitting}
        error={editError}
        onClose={() => {
          setEditingMember(null)
          setEditError(null)
        }}
        onSubmit={handleEditMember}
      />
    </div>
  )
}
