import { useEffect, useMemo, useState } from 'react'
import * as adminApi from '../../api/admin'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  TableId,
  formatTableDate,
} from '../../components/ui'
import type { BadgeTone, DataTableColumn } from '../../components/ui'
import { useAuthStore } from '../../stores/authStore'
import { useSpaceStore } from '../../stores/spaceStore'
import type { Space, SpaceType } from '../../types'

const typeMeta: Record<SpaceType, { tone: BadgeTone; label: string }> = {
  public: { tone: 'blue', label: 'Public' },
  specific: { tone: 'green', label: 'Specific' },
  private: { tone: 'orange', label: 'Private' },
}

function spaceCode(id: number) {
  return `S-${String(id).padStart(4, '0')}`
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

export function AdminSpacesPage() {
  const token = useAuthStore((s) => s.token)
  const deleteSpace = useSpaceStore((s) => s.deleteSpace)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    adminApi
      .getOverview(token)
      .then((overview) => setSpaces(overview.spaces))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load spaces')
      })
      .finally(() => setLoading(false))
  }, [token])

  async function handleDelete(space: Space) {
    if (!window.confirm(`Delete "${space.name}"? This cannot be undone.`)) return
    setDeletingId(space.id)
    setError(null)
    try {
      await deleteSpace(space.id)
      setSpaces((prev) => prev.filter((item) => item.id !== space.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete space')
    } finally {
      setDeletingId(null)
    }
  }

  const columns = useMemo<DataTableColumn<Space>[]>(
    () => [
      {
        id: 'id',
        header: 'ID',
        sortable: true,
        sortValue: (space) => space.id,
        cell: (space) => (
          <TableId value={spaceCode(space.id)} tone={typeMeta[space.space_type].tone} />
        ),
      },
      {
        id: 'type',
        header: 'Type',
        sortable: true,
        sortValue: (space) => space.space_type,
        cell: (space) => {
          const meta = typeMeta[space.space_type]
          return <Badge tone={meta.tone}>{meta.label}</Badge>
        },
      },
      {
        id: 'name',
        header: 'Name',
        sortable: true,
        sortValue: (space) => space.name,
        cell: (space) => <span className="font-medium text-ink">{space.name}</span>,
      },
      {
        id: 'description',
        header: 'Description',
        sortable: true,
        sortValue: (space) => space.description || '',
        className: 'max-w-[240px] truncate text-[#6b7280]',
        cell: (space) => space.description || '—',
      },
      {
        id: 'created_by',
        header: 'Created by',
        sortable: true,
        sortValue: (space) => space.created_by?.full_name || space.created_by?.email || '',
        cell: (space) => space.created_by?.full_name || space.created_by?.email || 'Unknown',
      },
      {
        id: 'created_at',
        header: 'Created',
        sortable: true,
        sortValue: (space) => new Date(space.created_at).getTime(),
        className: 'whitespace-nowrap text-[#6b7280]',
        cell: (space) => formatTableDate(space.created_at),
      },
      {
        id: 'actions',
        header: 'Action',
        align: 'right',
        headerClassName: 'px-4',
        className: 'px-4',
        cell: (space) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="danger"
              size="icon"
              aria-label={`Delete ${space.name}`}
              title="Delete space"
              disabled={deletingId === space.id}
              onClick={() => void handleDelete(space)}
            >
              <TrashIcon />
            </Button>
          </div>
        ),
      },
    ],
    [deletingId],
  )

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <section className="fade-up">
        <h1 className="font-display text-3xl font-bold text-ink">Space management</h1>
        <p className="mt-1 text-muted">All spaces across the organization.</p>
      </section>

      {error ? <Alert>{error}</Alert> : null}

      <DataTable
        columns={columns}
        data={spaces}
        getRowId={(space) => space.id}
        selectable
        loading={loading}
        emptyMessage="No spaces yet."
        defaultSortId="id"
      />
    </div>
  )
}
