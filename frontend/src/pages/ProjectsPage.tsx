import { useMemo, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Input,
  formatTableDate,
} from '../components/ui'
import type { BadgeTone, DataTableColumn } from '../components/ui'
import { useWorkProjectsQuery } from '../hooks'
import { useAuthStore } from '../stores/authStore'
import type { ProjectStatus, WorkProject } from '../types'

const statusMeta: Record<ProjectStatus, { tone: BadgeTone; label: string }> = {
  open: { tone: 'orange', label: 'Open' },
  in_progress: { tone: 'blue', label: 'In Progress' },
  completed: { tone: 'green', label: 'Completed' },
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: projects = [], isLoading, error } = useWorkProjectsQuery()
  const [query, setQuery] = useState('')

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((project) => {
      const haystack = [
        project.name,
        project.space_name,
        project.status,
        statusMeta[project.status]?.label,
        project.created_by.full_name,
        project.created_by.email,
        ...(project.members || []).flatMap((m) => [m.full_name, m.email]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [projects, query])

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

      {error ? (
        <Alert className="mb-4">
          {error instanceof Error ? error.message : 'Failed to load projects'}
        </Alert>
      ) : null}

      <div className="fade-up-delay mb-3 max-w-sm">
        <Input
          id="project-search"
          label="Search projects"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, space, status, creator…"
          leading={<FiSearch size={16} aria-hidden />}
        />
      </div>

      <div className="fade-up-delay overflow-hidden rounded-[20px] border border-line bg-surface shadow-sm">
        <DataTable
          columns={columns}
          data={filteredProjects}
          getRowId={(project) => project.id}
          loading={isLoading}
          emptyMessage={query.trim() ? 'No projects match your search.' : 'No projects to show.'}
          defaultSortId="created"
          defaultSortDir="desc"
        />
      </div>
    </div>
  )
}
