import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { KanbanBoard } from '../components/project/KanbanBoard'
import { TaskDrawer, type TaskFormPayload } from '../components/project/TaskDrawer'
import { TaskViewDrawer } from '../components/project/TaskViewDrawer'
import { Alert, Button, ProjectDetailSkeleton } from '../components/ui'
import {
  setBoardStages,
  useCreateStageMutation,
  useCreateTaskMutation,
  useDeleteStageMutation,
  useDeleteTaskMutation,
  useProjectBoardQuery,
  useProjectQuery,
  useUpdateStageMutation,
  useUpdateTaskMutation,
} from '../hooks'
import { toast } from '../stores/toastStore'
import type { ProjectStage, ProjectTask } from '../types'
import { cn } from '../lib/cn'

export function ProjectDetailPage() {
  const { spaceId: spaceIdParam, projectId: projectIdParam } = useParams<{
    spaceId: string
    projectId: string
  }>()
  const spaceId = Number(spaceIdParam)
  const projectId = Number(projectIdParam)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const projectQuery = useProjectQuery(spaceId, projectId)
  const boardQuery = useProjectBoardQuery(spaceId, projectId)
  const createTask = useCreateTaskMutation(spaceId, projectId)
  const updateTask = useUpdateTaskMutation(spaceId, projectId)
  const deleteTask = useDeleteTaskMutation(spaceId, projectId)
  const createStage = useCreateStageMutation(spaceId, projectId)
  const updateStage = useUpdateStageMutation(spaceId, projectId)
  const deleteStage = useDeleteStageMutation(spaceId, projectId)

  const project = projectQuery.data ?? null
  const stages = boardQuery.data?.stages ?? []
  const loading = (projectQuery.isLoading || boardQuery.isLoading) && !project
  const error =
    projectQuery.error || boardQuery.error
      ? ((projectQuery.error || boardQuery.error) as Error).message
      : null

  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [taskStageId, setTaskStageId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [viewTaskId, setViewTaskId] = useState<number | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)

  function openCreateTask(stageId: number) {
    setEditingTask(null)
    setTaskStageId(stageId)
    setTaskDrawerOpen(true)
  }

  function openViewTask(task: ProjectTask) {
    setViewTaskId(task.id)
    setViewDrawerOpen(true)
  }

  function openEditTask(task: ProjectTask) {
    setViewDrawerOpen(false)
    setEditingTask(task)
    setTaskStageId(task.stage_id)
    setTaskDrawerOpen(true)
  }

  function closeTaskDrawer() {
    setTaskDrawerOpen(false)
    setEditingTask(null)
    setTaskStageId(null)
  }

  function closeViewDrawer() {
    setViewDrawerOpen(false)
    setViewTaskId(null)
  }

  function handleStagesChange(next: ProjectStage[]) {
    setBoardStages(queryClient, spaceId, projectId, next)
  }

  async function handleSaveTask(payload: TaskFormPayload) {
    try {
      if (editingTask) {
        const updated = await updateTask.mutateAsync({
          taskId: editingTask.id,
          payload: {
            title: payload.title,
            description: payload.description,
            stage_id: payload.stage_id,
            priority: payload.priority,
            assignee_id: payload.assignee_id,
          },
        })
        toast.success('Task updated', updated.title)
      } else {
        const created = await createTask.mutateAsync({
          title: payload.title,
          description: payload.description,
          stage_id: payload.stage_id,
          priority: payload.priority,
          assignee_id: payload.assignee_id,
        })
        toast.success('Task created', created.title)
      }
      closeTaskDrawer()
    } catch (err) {
      toast.error('Failed to save task', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleMoveTask(taskId: number, stageId: number, position: number) {
    try {
      await updateTask.mutateAsync({
        taskId,
        payload: { stage_id: stageId, position },
      })
    } catch (err) {
      toast.error('Failed to move task', err instanceof Error ? err.message : undefined)
      void boardQuery.refetch()
    }
  }

  async function handleDeleteTask(taskId: number) {
    if (!window.confirm('Delete this task?')) return
    try {
      await deleteTask.mutateAsync(taskId)
      toast.success('Task deleted')
    } catch (err) {
      toast.error('Failed to delete task', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleRenameStage(stageId: number, name: string) {
    const updated = await updateStage.mutateAsync({ stageId, payload: { name } })
    toast.success('Stage renamed', updated.name)
  }

  async function handleDeleteStage(stageId: number) {
    if (!window.confirm('Delete this stage? It must be empty.')) return
    try {
      await deleteStage.mutateAsync(stageId)
      toast.success('Stage deleted')
    } catch (err) {
      toast.error('Failed to delete stage', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleAddStage(name: string) {
    const created = await createStage.mutateAsync({ name })
    toast.success('Stage created', created.name)
  }

  if (!Number.isFinite(spaceId) || !Number.isFinite(projectId)) {
    return <Alert>Invalid project.</Alert>
  }

  if (loading) {
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
          onStagesChange={handleStagesChange}
          onAddTask={openCreateTask}
          onViewTask={openViewTask}
          onEditTask={openEditTask}
          onMoveTask={handleMoveTask}
          onDeleteTask={handleDeleteTask}
          onRenameStage={handleRenameStage}
          onDeleteStage={handleDeleteStage}
          onAddStage={handleAddStage}
        />
      </section>

      <TaskViewDrawer
        open={viewDrawerOpen}
        spaceId={spaceId}
        projectId={projectId}
        taskId={viewTaskId}
        members={people}
        onClose={closeViewDrawer}
        onEdit={() => {
          const task =
            stages.flatMap((stage) => stage.tasks).find((item) => item.id === viewTaskId) ?? null
          if (task) openEditTask(task)
        }}
      />

      <TaskDrawer
        open={taskDrawerOpen}
        stages={stages}
        members={people}
        initialStageId={taskStageId}
        editing={editingTask}
        submitting={createTask.isPending || updateTask.isPending}
        onClose={closeTaskDrawer}
        onSubmit={handleSaveTask}
      />
    </div>
  )
}
