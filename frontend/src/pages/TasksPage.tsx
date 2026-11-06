import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  formatTableDate,
} from '../components/ui'
import type { BadgeTone, DataTableColumn } from '../components/ui'
import { useWorkTasksQuery } from '../hooks'
import { useAuthStore } from '../stores/authStore'
import type { WorkTask } from '../types'

function stageTone(name: string): BadgeTone {
  const key = name.toLowerCase()
  if (key.includes('done') || key.includes('complete')) return 'green'
  if (key.includes('progress') || key.includes('doing')) return 'blue'
  if (key.includes('todo') || key.includes('backlog')) return 'orange'
  return 'purple'
}

export function TasksPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: tasks = [], isLoading, error } = useWorkTasksQuery()

  const columns = useMemo<DataTableColumn<WorkTask>[]>(
    () => [
      {
        id: 'title',
        header: 'Task',
        sortable: true,
        sortValue: (task) => task.title,
        cell: (task) => (
          <button
            type="button"
            onClick={() =>
              navigate(`/app/spaces/${task.space_id}/projects/${task.project_id}`)
            }
            className="cursor-pointer text-left font-semibold text-ink transition hover:text-accent"
          >
            {task.title}
          </button>
        ),
      },
      {
        id: 'stage',
        header: 'Stage',
        sortable: true,
        sortValue: (task) => task.stage_name,
        cell: (task) => <Badge tone={stageTone(task.stage_name)}>{task.stage_name}</Badge>,
      },
      {
        id: 'project',
        header: 'Project',
        sortable: true,
        sortValue: (task) => task.project_name,
        cell: (task) => <span className="text-sm text-ink">{task.project_name}</span>,
      },
      {
        id: 'space',
        header: 'Space',
        sortable: true,
        sortValue: (task) => task.space_name,
        cell: (task) => <span className="text-sm text-muted">{task.space_name}</span>,
      },
      {
        id: 'assignee',
        header: 'Assignee',
        sortable: true,
        sortValue: (task) => task.assignee?.full_name || task.assignee?.email || '',
        cell: (task) => (
          <span className="text-sm text-ink">
            {task.assignee?.full_name || task.assignee?.email || 'Unassigned'}
          </span>
        ),
      },
      {
        id: 'created_by',
        header: 'Created by',
        sortable: true,
        sortValue: (task) => task.created_by.full_name || task.created_by.email,
        cell: (task) => (
          <span className="text-sm text-muted">
            {task.created_by.full_name || task.created_by.email}
          </span>
        ),
      },
      {
        id: 'updated',
        header: 'Updated',
        sortable: true,
        sortValue: (task) => task.updated_at,
        cell: (task) => (
          <span className="text-sm text-muted">{formatTableDate(task.updated_at)}</span>
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
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Tasks</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">
            All tasks
          </h1>
          <p className="mt-1 text-muted">
            {isOwner
              ? 'Tenant owners can see every task across company projects.'
              : 'You see tasks you created or that are assigned to you.'}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => navigate('/app/projects')}>
          View projects
        </Button>
      </section>

      {error ? (
        <Alert className="mb-4">
          {error instanceof Error ? error.message : 'Failed to load tasks'}
        </Alert>
      ) : null}

      <div className="fade-up-delay overflow-hidden rounded-[20px] border border-line bg-surface shadow-sm">
        <DataTable
          columns={columns}
          data={tasks}
          getRowId={(task) => task.id}
          loading={isLoading}
          emptyMessage="No tasks to show."
          defaultSortId="updated"
          defaultSortDir="desc"
        />
      </div>
    </div>
  )
}
