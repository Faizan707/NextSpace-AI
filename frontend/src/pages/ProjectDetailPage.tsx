import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FiPlus } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { KanbanBoard } from '../components/project/KanbanBoard'
import { TaskDrawer, type TaskFormPayload } from '../components/project/TaskDrawer'
import { TaskViewDrawer } from '../components/project/TaskViewDrawer'
import {
  AddProjectMembersPicker,
  countProjectAddSelection,
} from '../components/space/AddProjectMembersPicker'
import { Alert, Breadcrumbs, Button, Drawer, ProjectDetailSkeleton } from '../components/ui'
import {
  setBoardStages,
  useAddProjectMembersMutation,
  useCreateStageMutation,
  useCreateTaskMutation,
  useDeleteStageMutation,
  useDeleteTaskMutation,
  useProjectBoardQuery,
  useProjectQuery,
  useRemoveProjectMemberMutation,
  useSpaceQuery,
  useSpaceTeamsQuery,
  useUpdateStageMutation,
  useUpdateTaskMutation,
} from '../hooks'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import type { ProjectStage, ProjectTask, SpaceCreator } from '../types'
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
  const currentUser = useAuthStore((s) => s.user)

  const spaceQuery = useSpaceQuery(spaceId)
  const teamsQuery = useSpaceTeamsQuery(spaceId)
  const projectQuery = useProjectQuery(spaceId, projectId)
  const boardQuery = useProjectBoardQuery(spaceId, projectId)
  const createTask = useCreateTaskMutation(spaceId, projectId)
  const updateTask = useUpdateTaskMutation(spaceId, projectId)
  const deleteTask = useDeleteTaskMutation(spaceId, projectId)
  const createStage = useCreateStageMutation(spaceId, projectId)
  const updateStage = useUpdateStageMutation(spaceId, projectId)
  const deleteStage = useDeleteStageMutation(spaceId, projectId)
  const addProjectMembers = useAddProjectMembersMutation(spaceId)
  const removeProjectMember = useRemoveProjectMemberMutation(spaceId)

  const space = spaceQuery.data ?? null
  const teams = teamsQuery.data ?? []
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
  const [membersOpen, setMembersOpen] = useState(false)
  const [memberSelected, setMemberSelected] = useState<Set<number>>(new Set())
  const [teamsSelected, setTeamsSelected] = useState<Set<number>>(new Set())
  const [memberError, setMemberError] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null)

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

  const people = project
    ? project.members?.length > 0
      ? project.members
      : [project.created_by]
    : []
  const preview = people.slice(0, 4)
  const extra = Math.max(people.length - preview.length, 0)

  const existingMemberIds = useMemo(
    () => new Set(people.map((member) => member.id)),
    [people],
  )

  const addSelectionCount = useMemo(
    () => countProjectAddSelection(memberSelected, teamsSelected, teams, existingMemberIds),
    [memberSelected, teamsSelected, teams, existingMemberIds],
  )

  function resetMemberSelection() {
    setMemberSelected(new Set())
    setTeamsSelected(new Set())
  }

  function toggleMember(userId: number) {
    setMemberSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function toggleTeam(teamId: number) {
    setTeamsSelected((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  async function handleAddMembers() {
    if (memberSelected.size === 0 && teamsSelected.size === 0) return
    setMemberError(null)
    try {
      await addProjectMembers.mutateAsync({
        projectId,
        userIds: [...memberSelected],
        teamIds: [...teamsSelected],
      })
      toast.success(
        addSelectionCount === 1 ? '1 member added' : `${addSelectionCount} members added`,
      )
      resetMemberSelection()
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to add members')
    }
  }

  async function handleRemoveMember(member: SpaceCreator) {
    if (!window.confirm(`Remove ${member.full_name || member.email} from this project?`)) {
      return
    }
    setMemberError(null)
    setRemovingMemberId(member.id)
    try {
      await removeProjectMember.mutateAsync({ projectId, userId: member.id })
      toast.success('Member removed', member.full_name || member.email)
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setRemovingMemberId(null)
    }
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

  const canManageMembers =
    currentUser?.role === 'tenant_owner' ||
    space?.created_by_id === currentUser?.id ||
    project.created_by_id === currentUser?.id

  const canEditBoard =
    canManageMembers || people.some((member) => member.id === currentUser?.id)

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <section className="fade-up">
        <Breadcrumbs
          items={[
            { label: 'Spaces', to: '/app/spaces' },
            { label: space?.name || 'Space', to: `/app/spaces/${spaceId}` },
            { label: project.name },
          ]}
        />
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
            {canManageMembers ? (
              <button
                type="button"
                title="Manage members"
                aria-label="Manage project members"
                onClick={() => {
                  setMemberError(null)
                  resetMemberSelection()
                  setMembersOpen(true)
                }}
                className="ml-2 grid size-9 cursor-pointer place-items-center rounded-full border border-dashed border-line text-muted transition hover:border-accent hover:bg-accent-soft hover:text-accent"
              >
                <FiPlus size={16} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                title="View members"
                aria-label="View project members"
                onClick={() => {
                  setMemberError(null)
                  resetMemberSelection()
                  setMembersOpen(true)
                }}
                className="ml-2 text-xs font-semibold text-accent hover:underline"
              >
                Members
              </button>
            )}
          </div>
        </div>
      </section>

      {error ? <Alert>{error}</Alert> : null}

      <section className="fade-up-delay">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Board</h2>
            <p className="text-sm text-muted">
              {canEditBoard
                ? 'Default stages: Todo, In Progress, Done. Add custom stages anytime.'
                : 'View only — you need to be a project member to create or edit tasks.'}
            </p>
          </div>
        </div>

        <KanbanBoard
          stages={stages}
          canEdit={canEditBoard}
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
        {...(canEditBoard
          ? {
              onEdit: () => {
                const task =
                  stages.flatMap((stage) => stage.tasks).find((item) => item.id === viewTaskId) ??
                  null
                if (task) openEditTask(task)
              },
            }
          : {})}
      />

      {canEditBoard ? (
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
      ) : null}

      <Drawer
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title="Project members"
        description="Manage who can work on this project."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setMembersOpen(false)}>
              Close
            </Button>
            {canManageMembers ? (
              <Button
                type="button"
                disabled={
                  (memberSelected.size === 0 && teamsSelected.size === 0) ||
                  addProjectMembers.isPending
                }
                onClick={() => void handleAddMembers()}
              >
                {addProjectMembers.isPending
                  ? 'Adding…'
                  : `Add${addSelectionCount > 0 ? ` (${addSelectionCount})` : ''}`}
              </Button>
            ) : null}
          </>
        }
      >
        {memberError ? <Alert className="mb-3">{memberError}</Alert> : null}

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Current members
            </p>
            <ul className="space-y-2">
              {people.map((member) => {
                const isCreator = member.id === project.created_by_id
                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5"
                  >
                    <Avatar
                      name={member.full_name}
                      email={member.email}
                      imageUrl={member.avatar_url}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {member.full_name || 'Unnamed'}
                        {isCreator ? (
                          <span className="ml-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                            Owner
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted">{member.email}</span>
                    </span>
                    {canManageMembers && !isCreator ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={removingMemberId === member.id || removeProjectMember.isPending}
                        onClick={() => void handleRemoveMember(member)}
                      >
                        {removingMemberId === member.id ? '…' : 'Remove'}
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>

          {canManageMembers ? (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
                Add from space
              </p>
              <AddProjectMembersPicker
                people={space?.members ?? []}
                teams={teams}
                existingMemberIds={existingMemberIds}
                selectedPeople={memberSelected}
                selectedTeams={teamsSelected}
                onTogglePerson={toggleMember}
                onToggleTeam={toggleTeam}
              />
            </div>
          ) : null}
        </div>
      </Drawer>
    </div>
  )
}
