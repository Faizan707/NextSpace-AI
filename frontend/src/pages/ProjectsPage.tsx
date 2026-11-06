import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as workApi from '../api/work'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  formatTableDate,
} from '../components/ui'
import type { BadgeTone, DataTableColumn } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import type { ProjectStatus, WorkProject } from '../types'

const statusMeta: Record<ProjectStatus, { tone: BadgeTone; label: string }> = {
  open: { tone: 'orange', label: 'Open' },
  in_progress: { tone: 'blue', label: 'In Progress' },
  completed: { tone: 'green', label: 'Completed' },
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const [projects, setProjects] = useState<WorkProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    workApi
      .listWorkProjects(token)
      .then(setProjects)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      })
      .finally(() => setLoading(false))
  }, [token])

  const columns = useMemo<DataTableColumn<WorkProject>[]>(
    () => [
      {
        id: 'name',
        header: 'Project',
        sortable: true,
        sortValue: (project) => project.name,
        cell: (project) => (
          <button
            type="button"
            onClick={() =>
              navigate(`/app/spaces/${project.space_id}/projects/${project.id}`)
            }
            className="cursor-pointer text-left font-semibold text-ink transition hover:text-accent"
          >
            {project.name}
          </button>
        ),
      },
      {
        id: 'space',
        header: 'Space',
        sortable: true,
        sortValue: (project) => project.space_name,
        cell: (project) => <span className="text-muted">{project.space_name}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        sortable: true,
        sortValue: (project) => project.status,
        cell: (project) => {
          const meta = statusMeta[project.status] || statusMeta.open
          return <Badge tone={meta.tone}>{meta.label}</Badge>
        },
      },
      {
        id: 'progress',
        header: 'Progress',
        sortable: true,
        sortValue: (project) => project.progress,
        cell: (project) => (
          <span className="tabular-nums text-sm font-semibold text-ink">{project.progress}%</span>
        ),
      },
      {
        id: 'deadline',
        header: 'Deadline',
        sortable: true,
        sortValue: (project) => project.deadline || '',
        cell: (project) => (
          <span className="text-sm text-muted">
            {project.deadline ? formatTableDate(project.deadline) : '—'}
          </span>
        ),
      },
      {
        id: 'owner',
        header: 'Created by',
        sortable: true,
        sortValue: (project) => project.created_by.full_name || project.created_by.email,
        cell: (project) => (
          <span className="text-sm text-ink">
            {project.created_by.full_name || project.created_by.email}
          </span>
        ),
      },
      {
        id: 'members',
        header: 'Members',
        sortable: true,
        sortValue: (project) => project.members?.length || 0,
        cell: (project) => (
          <span className="tabular-nums text-sm text-muted">{project.members?.length || 0}</span>
        ),
      },
      {
        id: 'created',
        header: 'Created',
        sortable: true,
        sortValue: (project) => project.created_at,
        cell: (project) => (
          <span className="text-sm text-muted">{formatTableDate(project.created_at)}</span>
        ),
      },
    ],
    [navigate],
  )

  const isOwner = user?.role === 'tenant_owner'

  return (
    <div className="mx-auto max-w-7xl">
      <section className="fade-up mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Projects</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">
            All projects
          </h1>
          <p className="mt-1 text-muted">
            {isOwner
              ? 'Tenant owners can see every project in the company.'
              : 'You see projects you created or were added to.'}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => navigate('/app/spaces')}>
          Go to spaces
        </Button>
      </section>

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <div className="fade-up-delay overflow-hidden rounded-[20px] border border-line bg-surface shadow-sm">
        <DataTable
          columns={columns}
          data={projects}
          getRowId={(project) => project.id}
          loading={loading}
          emptyMessage="No projects to show."
          defaultSortId="created"
          defaultSortDir="desc"
        />
      </div>
    </div>
  )
}
