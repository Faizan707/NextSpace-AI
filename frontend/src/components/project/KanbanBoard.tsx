import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  FiBookmark,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiUser,
} from 'react-icons/fi'
import { Button, ContextMenu, controlClass } from '../ui'
import type { ProjectStage, ProjectTask, TaskPriority } from '../../types'
import { MoreIcon } from '../space/icons'
import { cn } from '../../lib/cn'

interface KanbanBoardProps {
  stages: ProjectStage[]
  canEdit?: boolean
  onStagesChange: (stages: ProjectStage[]) => void
  onAddTask: (stageId: number) => void
  onViewTask: (task: ProjectTask) => void
  onEditTask: (task: ProjectTask) => void
  onMoveTask: (taskId: number, stageId: number, position: number) => Promise<void>
  onDeleteTask: (taskId: number) => Promise<void>
  onRenameStage: (stageId: number, name: string) => Promise<void>
  onDeleteStage: (stageId: number) => Promise<void>
  onAddStage: (name: string) => Promise<void>
}

function formatCardDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTimeAgo(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const distance = formatDistanceToNow(date).replace(/^about /, '')
  return `created ${distance} ago`
}

function stageProgress(stageName: string) {
  const key = stageName.trim().toLowerCase()
  if (key === 'todo') return 8
  if (key === 'done' || key === 'complete' || key === 'completed') return 100
  return 50
}

function priorityMeta(priority: TaskPriority | undefined) {
  if (priority === 'high') return { label: 'High', className: 'text-danger' }
  if (priority === 'low') return { label: 'Low', className: 'text-muted' }
  return { label: 'Medium', className: 'text-[#ea580c]' }
}

function TaskCard({
  task,
  stageName,
  dragging,
  dragHandleProps,
  onView,
  onEdit,
  onDelete,
}: {
  task: ProjectTask
  stageName: string
  dragging?: boolean
  dragHandleProps?: Record<string, unknown>
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const progress = stageProgress(stageName)
  const priority = priorityMeta(task.priority)
  const created = formatCardDate(task.created_at)
  const createdAgo = formatTimeAgo(task.created_at)
  const assigneeLabel = task.assignee?.full_name || task.assignee?.email || 'Unassigned'

  return (
    <article
      className={cn(
        'group relative rounded-xl border border-line bg-surface',
        'shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition duration-200',
        'hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)]',
        dragging && 'scale-[1.02] cursor-grabbing shadow-[0_14px_32px_rgba(15,23,42,0.12)] ring-2 ring-accent/25',
        dragHandleProps && !dragging && 'cursor-grab',
      )}
      {...(dragHandleProps || {})}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onView}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onView?.()
          }
        }}
        className="block w-full px-4 pb-3 pt-3.5 text-left"
      >
        <div className="flex items-center justify-between gap-3 text-[0.72rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <FiCalendar size={13} aria-hidden />
            {created}
          </span>
          <span className="inline-flex items-center gap-1.5" title="Created">
            <FiClock size={13} aria-hidden />
            {createdAgo}
          </span>
        </div>

        <h4 className="mt-3 m-0 line-clamp-2 text-[0.98rem] font-bold leading-snug text-ink">
          {task.title}
        </h4>

        {task.description ? (
          <p className="mt-1.5 m-0 line-clamp-2 text-[0.8rem] leading-relaxed text-muted">
            {task.description}
          </p>
        ) : (
          <p className="mt-1.5 m-0 text-[0.8rem] text-muted/70">No description</p>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-[0.8rem] font-medium text-ink/80">
          <FiBookmark size={14} className="text-[#7c6cf0]" aria-hidden />
          Task
        </div>

        <p className={cn('mt-1.5 m-0 text-[0.8rem] font-semibold', priority.className)}>
          {priority.label}
        </p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8f5f0]">
          <div
            className="h-full rounded-full bg-[#2dd4bf] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-2 border-t border-line px-3.5 py-2.5"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onView}
          className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 text-left text-[0.8rem] font-semibold text-ink"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-md border border-line text-muted">
            <FiUser size={12} aria-hidden />
          </span>
          <span className="truncate">{assigneeLabel}</span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 text-muted">
          {onEdit ? (
            <button
              type="button"
              title="Edit task"
              aria-label={`Edit ${task.title}`}
              onClick={(event) => {
                event.stopPropagation()
                onEdit()
              }}
              className="grid size-7 cursor-pointer place-items-center rounded-md transition hover:bg-surface-2 hover:text-ink"
            >
              <FiEdit2 size={13} aria-hidden />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              title="Delete task"
              aria-label={`Delete ${task.title}`}
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
              className="grid size-7 cursor-pointer place-items-center rounded-md transition hover:bg-danger-soft hover:text-danger"
            >
              <FiTrash2 size={13} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function SortableTask({
  task,
  stageName,
  canEdit,
  onView,
  onEdit,
  onDelete,
}: {
  task: ProjectTask
  stageName: string
  canEdit: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', task, stageName },
    disabled: !canEdit,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="touch-none"
    >
      <TaskCard
        task={task}
        stageName={stageName}
        dragging={isDragging}
        onView={onView}
        onEdit={canEdit ? onEdit : undefined}
        onDelete={canEdit ? onDelete : undefined}
        dragHandleProps={canEdit ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  )
}

function StageColumn({
  stage,
  canEdit,
  onAddTask,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onRenameStage,
  onDeleteStage,
}: {
  stage: ProjectStage
  canEdit: boolean
  onAddTask: (stageId: number) => void
  onViewTask: (task: ProjectTask) => void
  onEditTask: (task: ProjectTask) => void
  onDeleteTask: (taskId: number) => Promise<void>
  onRenameStage: (stageId: number, name: string) => Promise<void>
  onDeleteStage: (stageId: number) => Promise<void>
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { type: 'stage', stage },
    disabled: !canEdit,
  })
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(stage.name)
  const [busy, setBusy] = useState(false)

  const taskIds = stage.tasks.map((task) => `task-${task.id}`)

  async function submitRename() {
    const name = renameValue.trim()
    if (!name || name === stage.name) {
      setRenaming(false)
      setRenameValue(stage.name)
      return
    }
    setBusy(true)
    try {
      await onRenameStage(stage.id, name)
      setRenaming(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'flex w-[300px] shrink-0 flex-col rounded-[24px] border border-line bg-bg-elevated/50',
        isOver && 'border-teal/35 bg-teal-soft/25',
      )}
    >
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              id={`rename-stage-${stage.id}`}
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onBlur={() => void submitRename()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void submitRename()
                }
                if (event.key === 'Escape') {
                  setRenaming(false)
                  setRenameValue(stage.name)
                }
              }}
              autoFocus
              disabled={busy}
              className={cn(controlClass, '!py-1.5 text-sm font-semibold')}
            />
          ) : (
            <div>
              <h3 className="m-0 truncate font-display text-base font-bold text-ink">{stage.name}</h3>
              <p className="m-0 text-xs text-muted">
                {stage.tasks.length} task{stage.tasks.length === 1 ? '' : 's'}
                {stage.is_default ? ' · default' : ''}
              </p>
            </div>
          )}
        </div>
        {canEdit ? (
          <ContextMenu
            align="end"
            trigger={({ open, props }) => (
              <button
                {...props}
                aria-label={`Stage actions for ${stage.name}`}
                className={cn(
                  'grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-surface hover:text-ink',
                  open && 'bg-surface text-ink',
                )}
              >
                <MoreIcon />
              </button>
            )}
            items={[
              {
                id: 'rename',
                label: 'Rename',
                onSelect: () => {
                  setRenameValue(stage.name)
                  setRenaming(true)
                },
              },
              ...(!stage.is_default
                ? [
                    {
                      id: 'delete',
                      label: 'Delete stage',
                      danger: true as const,
                      onSelect: () => void onDeleteStage(stage.id),
                    },
                  ]
                : []),
            ]}
          />
        ) : null}
      </div>

      <div ref={setNodeRef} className="flex min-h-[120px] flex-1 flex-col gap-3 p-3.5">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {stage.tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              stageName={stage.name}
              canEdit={canEdit}
              onView={() => onViewTask(task)}
              onEdit={() => onEditTask(task)}
              onDelete={() => void onDeleteTask(task.id)}
            />
          ))}
        </SortableContext>

        {canEdit ? (
          <button
            type="button"
            onClick={() => onAddTask(stage.id)}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-teal hover:bg-surface hover:text-teal"
          >
            <FiPlus size={14} aria-hidden />
            Add task
          </button>
        ) : null}
      </div>
    </div>
  )
}

function findStageByTaskId(stages: ProjectStage[], taskId: number) {
  return stages.find((stage) => stage.tasks.some((task) => task.id === taskId))
}

function parseTaskId(id: string | number) {
  const value = String(id)
  if (!value.startsWith('task-')) return null
  const num = Number(value.replace('task-', ''))
  return Number.isFinite(num) ? num : null
}

function parseStageId(id: string | number) {
  const value = String(id)
  if (!value.startsWith('stage-')) return null
  const num = Number(value.replace('stage-', ''))
  return Number.isFinite(num) ? num : null
}

export function KanbanBoard({
  stages,
  canEdit = true,
  onStagesChange,
  onAddTask,
  onViewTask,
  onEditTask,
  onMoveTask,
  onDeleteTask,
  onRenameStage,
  onDeleteStage,
  onAddStage,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<{
    task: ProjectTask
    stageName: string
  } | null>(null)
  const [stageName, setStageName] = useState('')
  const [addingStage, setAddingStage] = useState(false)
  const [stageBusy, setStageBusy] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Small move before drag starts so click still opens edit
      activationConstraint: { distance: 8 },
    }),
  )

  function moveTaskLocal(taskId: number, toStageId: number, toIndex: number) {
    const next = stages.map((stage) => ({
      ...stage,
      tasks: [...stage.tasks],
    }))
    const fromStage = next.find((stage) => stage.tasks.some((task) => task.id === taskId))
    const toStage = next.find((stage) => stage.id === toStageId)
    if (!fromStage || !toStage) return stages

    const fromIndex = fromStage.tasks.findIndex((task) => task.id === taskId)
    if (fromIndex < 0) return stages
    const [task] = fromStage.tasks.splice(fromIndex, 1)
    const updated = { ...task, stage_id: toStageId }
    const insertAt = Math.max(0, Math.min(toIndex, toStage.tasks.length))
    toStage.tasks.splice(insertAt, 0, updated)
    toStage.tasks = toStage.tasks.map((item, index) => ({ ...item, position: index }))
    fromStage.tasks = fromStage.tasks.map((item, index) => ({ ...item, position: index }))
    return next
  }

  function handleDragStart(event: DragStartEvent) {
    if (!canEdit) return
    const taskId = parseTaskId(event.active.id)
    if (taskId == null) return
    const stage = findStageByTaskId(stages, taskId)
    const task = stage?.tasks.find((item) => item.id === taskId)
    setActiveTask(task && stage ? { task, stageName: stage.name } : null)
  }

  function handleDragOver(event: DragOverEvent) {
    if (!canEdit) return
    const { active, over } = event
    if (!over) return
    const activeTaskId = parseTaskId(active.id)
    if (activeTaskId == null) return

    const overTaskId = parseTaskId(over.id)
    const overStageId = overTaskId != null
      ? findStageByTaskId(stages, overTaskId)?.id
      : parseStageId(over.id)
    if (overStageId == null) return

    const activeStage = findStageByTaskId(stages, activeTaskId)
    if (!activeStage || activeStage.id === overStageId) return

    const overStage = stages.find((stage) => stage.id === overStageId)
    if (!overStage) return
    const overIndex = overTaskId != null
      ? overStage.tasks.findIndex((task) => task.id === overTaskId)
      : overStage.tasks.length

    onStagesChange(moveTaskLocal(activeTaskId, overStageId, overIndex < 0 ? overStage.tasks.length : overIndex))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!canEdit) return
    const activeTaskId = parseTaskId(active.id)
    if (activeTaskId == null || !over) return

    const overTaskId = parseTaskId(over.id)
    const activeStage = findStageByTaskId(stages, activeTaskId)
    if (!activeStage) return

    let nextStages = stages
    if (overTaskId != null) {
      const overStage = findStageByTaskId(stages, overTaskId)
      if (!overStage) return
      if (activeStage.id === overStage.id) {
        const oldIndex = activeStage.tasks.findIndex((task) => task.id === activeTaskId)
        const newIndex = overStage.tasks.findIndex((task) => task.id === overTaskId)
        if (oldIndex === newIndex) return
        nextStages = stages.map((stage) => {
          if (stage.id !== activeStage.id) return stage
          return {
            ...stage,
            tasks: arrayMove(stage.tasks, oldIndex, newIndex).map((task, index) => ({
              ...task,
              position: index,
            })),
          }
        })
        onStagesChange(nextStages)
      }
    }

    const current = findStageByTaskId(nextStages, activeTaskId)
    const task = current?.tasks.find((item) => item.id === activeTaskId)
    if (!current || !task) return
    const position = current.tasks.findIndex((item) => item.id === activeTaskId)
    await onMoveTask(activeTaskId, current.id, position)
  }

  async function submitStage() {
    const name = stageName.trim()
    if (!name || stageBusy) return
    setStageBusy(true)
    try {
      await onAddStage(name)
      setStageName('')
      setAddingStage(false)
    } finally {
      setStageBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <div className="flex items-start gap-4 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              canEdit={canEdit}
              onAddTask={onAddTask}
              onViewTask={onViewTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onRenameStage={onRenameStage}
              onDeleteStage={onDeleteStage}
            />
          ))}

          {canEdit ? (
            <div className="w-[260px] shrink-0">
              {addingStage ? (
                <div className="rounded-[22px] border border-dashed border-line bg-surface p-3">
                  <input
                    id="new-stage-name"
                    value={stageName}
                    onChange={(event) => setStageName(event.target.value)}
                    placeholder="Stage name"
                    autoFocus
                    className={cn(controlClass, '!py-2 text-sm')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void submitStage()
                      }
                      if (event.key === 'Escape') {
                        setAddingStage(false)
                        setStageName('')
                      }
                    }}
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      disabled={stageBusy || !stageName.trim()}
                      onClick={() => void submitStage()}
                    >
                      Add stage
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setAddingStage(false)
                        setStageName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingStage(true)}
                  className="inline-flex h-[56px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[22px] border border-dashed border-line bg-bg-elevated/40 text-sm font-semibold text-muted transition hover:border-accent hover:text-accent"
                >
                  <FiPlus size={14} aria-hidden />
                  Add stage
                </button>
              )}
            </div>
          ) : null}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask.task} stageName={activeTask.stageName} dragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
