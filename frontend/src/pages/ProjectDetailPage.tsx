import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as spacesApi from '../api/spaces'
import { Avatar } from '../components/Avatar'
import { KanbanBoard } from '../components/project/KanbanBoard'
import { TaskDrawer, type TaskFormPayload } from '../components/project/TaskDrawer'
import { Alert, Button, ProjectDetailSkeleton } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import type { ProjectBoard, ProjectStage, ProjectTask, SpaceProject } from '../types'
import { cn } from '../lib/cn'

export function ProjectDetailPage() {
  const { spaceId: spaceIdParam, projectId: projectIdParam } = useParams<{
    spaceId: string
    projectId: string
  }>()
  const spaceId = Number(spaceIdParam)
  const projectId = Number(projectIdParam)
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const [project, setProject] = useState<SpaceProject | null>(null)
  const [stages, setStages] = useState<ProjectStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [taskStageId, setTaskStageId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [taskSubmitting, setTaskSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(spaceId) || !Number.isFinite(projectId)) return
    setLoading(true)
    setError(null)
    try {
      const [projectData, board] = await Promise.all([
        spacesApi.getProject(token, spaceId, projectId),
        spacesApi.getProjectBoard(token, spaceId, projectId),
      ])
      setProject(projectData)
      setStages(board.stages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
      setProject(null)
      setStages([])
    } finally {
      setLoading(false)
    }
  }, [token, spaceId, projectId])

  useEffect(() => {
    void load()
  }, [load])

  function applyBoard(board: ProjectBoard) {
    setStages(board.stages)
  }

  async function refreshBoard() {
    if (!token) return
    const board = await spacesApi.getProjectBoard(token, spaceId, projectId)
    applyBoard(board)
  }

  function openCreateTask(stageId: number) {
    setEditingTask(null)
    setTaskStageId(stageId)
    setTaskDrawerOpen(true)
  }

  function openEditTask(task: ProjectTask) {
    setEditingTask(task)
    setTaskStageId(task.stage_id)
    setTaskDrawerOpen(true)
  }

  function closeTaskDrawer() {
    setTaskDrawerOpen(false)
    setEditingTask(null)
    setTaskStageId(null)
  }

  async function handleSaveTask(payload: TaskFormPayload) {
    if (!token) return
    setTaskSubmitting(true)
    try {
      if (editingTask) {
        const updated = await spacesApi.updateTask(token, spaceId, projectId, editingTask.id, {
          title: payload.title,
          description: payload.description,
          stage_id: payload.stage_id,
          assignee_id: payload.assignee_id,
        })
        setStages((prev) => {
          const cleared = prev.map((stage) => ({
            ...stage,
            tasks: stage.tasks.filter((task) => task.id !== updated.id),
          }))
          return cleared.map((stage) =>
            stage.id === updated.stage_id
              ? { ...stage, tasks: [...stage.tasks, updated] }
              : stage,
          )
        })
        toast.success('Task updated', updated.title)
      } else {
        const created = await spacesApi.createTask(token, spaceId, projectId, {
          title: payload.title,
          description: payload.description,
          stage_id: payload.stage_id,
          assignee_id: payload.assignee_id,
        })
        setStages((prev) =>
          prev.map((stage) =>
            stage.id === created.stage_id
              ? { ...stage, tasks: [...stage.tasks, created] }
              : stage,
          ),
        )
        toast.success('Task created', created.title)
      }
      closeTaskDrawer()
    } finally {
      setTaskSubmitting(false)
    }
  }

  async function handleMoveTask(taskId: number, stageId: number, position: number) {
    if (!token) return
    try {
      await spacesApi.updateTask(token, spaceId, projectId, taskId, {
        stage_id: stageId,
        position,
      })
    } catch (err) {
      toast.error('Failed to move task', err instanceof Error ? err.message : undefined)
      await refreshBoard()
    }
  }

  async function handleDeleteTask(taskId: number) {
    if (!token) return
    if (!window.confirm('Delete this task?')) return
    await spacesApi.deleteTask(token, spaceId, projectId, taskId)
    setStages((prev) =>
      prev.map((stage) => ({
        ...stage,
        tasks: stage.tasks.filter((task) => task.id !== taskId),
      })),
    )
    toast.success('Task deleted')
  }

  async function handleRenameStage(stageId: number, name: string) {
    if (!token) return
    const updated = await spacesApi.updateStage(token, spaceId, projectId, stageId, { name })
    setStages((prev) =>
      prev.map((stage) => (stage.id === stageId ? { ...stage, name: updated.name } : stage)),
    )
    toast.success('Stage renamed', updated.name)
  }

  async function handleDeleteStage(stageId: number) {
    if (!token) return
    if (!window.confirm('Delete this stage? It must be empty.')) return
    try {
      await spacesApi.deleteStage(token, spaceId, projectId, stageId)
      setStages((prev) => prev.filter((stage) => stage.id !== stageId))
      toast.success('Stage deleted')
    } catch (err) {
      toast.error('Failed to delete stage', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleAddStage(name: string) {
    if (!token) return
    const created = await spacesApi.createStage(token, spaceId, projectId, { name })
    setStages((prev) => [...prev, { ...created, tasks: created.tasks || [] }])
    toast.success('Stage created', created.name)
  }

  if (!Number.isFinite(spaceId) || !Number.isFinite(projectId)) {
    return <Alert>Invalid project.</Alert>
  }

  if (loading && !project) {
    return <ProjectDetailSkeleton />
  }

  if (!project) {
    return (
      <div className="space-y-4">
        {error ? <Alert>{error}</Alert> : null}
        <Button type="button" variant="secondary" onClick={() => navigate(`/app/spaces/${spaceId}`)}>
          Back to space
        </Button>
      </div>
    )
  }

  const people = project.members?.length > 0 ? project.members : [project.created_by]
  const preview = people.slice(0, 4)
  const extra = Math.max(people.length - preview.length, 0)

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <section className="fade-up">
        <Link
          to={`/app/spaces/${spaceId}`}
          className="text-sm font-semibold text-accent hover:underline"
        >
          ← Back to space
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Project</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">
              {project.name}
            </h1>
            <p className="mt-1 text-muted">{project.description || 'No description'}</p>
          </div>
          <div className="flex items-center">
            {preview.map((member, index) => (
              <Avatar
                key={member.id}
                name={member.full_name}
                email={member.email}
                imageUrl={member.avatar_url}
                className={cn(index === 0 ? undefined : 'ml-[-8px]')}
              />
            ))}
            {extra > 0 ? (
              <span className="ml-[-8px] grid size-9 place-items-center rounded-full bg-bg-elevated text-[0.7rem] font-bold text-muted ring-2 ring-surface">
                +{extra}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {error ? <Alert>{error}</Alert> : null}

      <section className="fade-up-delay">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Board</h2>
            <p className="text-sm text-muted">
              Default stages: Todo, In Progress, Done. Add custom stages anytime.
            </p>
          </div>
        </div>

        <KanbanBoard
          stages={stages}
          onStagesChange={setStages}
          onAddTask={openCreateTask}
          onEditTask={openEditTask}
          onMoveTask={handleMoveTask}
          onDeleteTask={handleDeleteTask}
          onRenameStage={handleRenameStage}
          onDeleteStage={handleDeleteStage}
          onAddStage={handleAddStage}
        />
      </section>

      <TaskDrawer
        open={taskDrawerOpen}
        stages={stages}
        members={people}
        initialStageId={taskStageId}
        editing={editingTask}
        submitting={taskSubmitting}
        onClose={closeTaskDrawer}
        onSubmit={handleSaveTask}
      />
    </div>
  )
}
