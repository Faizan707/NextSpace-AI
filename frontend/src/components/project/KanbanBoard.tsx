import { useState } from 'react'
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
import { FiPlus } from 'react-icons/fi'
import { Avatar } from '../Avatar'
import { Button, ContextMenu, controlClass } from '../ui'
import type { ProjectStage, ProjectTask } from '../../types'
import { MoreIcon } from '../space/icons'
import { cn } from '../../lib/cn'

interface KanbanBoardProps {
  stages: ProjectStage[]
  onStagesChange: (stages: ProjectStage[]) => void
  onAddTask: (stageId: number) => void
  onEditTask: (task: ProjectTask) => void
  onMoveTask: (taskId: number, stageId: number, position: number) => Promise<void>
  onDeleteTask: (taskId: number) => Promise<void>
  onRenameStage: (stageId: number, name: string) => Promise<void>
  onDeleteStage: (stageId: number) => Promise<void>
  onAddStage: (name: string) => Promise<void>
}

function DragGrip() {
  return (
    <span className="grid grid-cols-2 gap-0.5" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className="size-1 rounded-full bg-current opacity-50" />
      ))}
    </span>
  )
}

function TaskCard({
  task,
  dragging,
  dragHandleProps,
  onEdit,
  onDelete,
}: {
  task: ProjectTask
  dragging?: boolean
  dragHandleProps?: Record<string, unknown>
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-[20px] border border-line bg-surface',
        'shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition duration-200',
        'hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]',
        dragging && 'scale-[1.02] shadow-[var(--shadow-panel)] ring-2 ring-teal/25',
      )}
    >
      <div className="absolute inset-y-3 left-0 w-1 rounded-full bg-teal/70 opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start gap-1 px-3.5 pt-3.5">
        {dragHandleProps ? (
          <button
            type="button"
            title="Drag task"
            aria-label={`Drag ${task.title}`}
            className="mt-0.5 grid size-7 shrink-0 cursor-grab place-items-center rounded-lg text-muted/70 transition hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
            {...dragHandleProps}
          >
            <DragGrip />
          </button>
        ) : (
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center text-muted/50">
            <DragGrip />
          </span>
        )}

        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 cursor-pointer py-0.5 text-left"
        >
          <h4 className="m-0 line-clamp-2 font-display text-[0.95rem] font-bold leading-snug text-ink">
            {task.title}
          </h4>
        </button>

        {onDelete ? (
          <ContextMenu
            align="end"
            trigger={({ open, props }) => (
              <button
                {...props}
                aria-label={`Task actions for ${task.title}`}
                className={cn(
                  'grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink',
                  open && 'bg-surface-2 text-ink',
                )}
              >
                <MoreIcon />
              </button>
            )}
            items={[
              {
                id: 'edit',
                label: 'Edit',
                onSelect: () => onEdit?.(),
              },
              {
                id: 'delete',
                label: 'Delete',
                danger: true,
                onSelect: () => onDelete(),
              },
            ]}
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="block w-full cursor-pointer px-3.5 pb-3.5 text-left"
      >
        {task.description ? (
          <p className="mt-1.5 m-0 line-clamp-2 pl-8 text-xs leading-relaxed text-muted">
            {task.description}
          </p>
        ) : null}

        <div className="mt-3 ml-8 overflow-hidden rounded-xl bg-surface-2">
          {task.assignee ? (
            <div className="flex items-center gap-2 px-2.5 py-2">
              <Avatar
                name={task.assignee.full_name}
                email={task.assignee.email}
                imageUrl={task.assignee.avatar_url}
                className="size-6 text-[0.6rem]"
              />
              <span className="truncate text-xs font-medium text-ink">
                {task.assignee.full_name || task.assignee.email}
              </span>
            </div>
          ) : (
            <div className="px-2.5 py-2 text-xs font-medium text-muted">Unassigned</div>
          )}
        </div>
      </button>
    </article>
  )
}

function SortableTask({
  task,
  onEdit,
  onDelete,
}: {
  task: ProjectTask
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
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
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function StageColumn({
  stage,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onRenameStage,
  onDeleteStage,
}: {
  stage: ProjectStage
  onAddTask: (stageId: number) => void
  onEditTask: (task: ProjectTask) => void
  onDeleteTask: (taskId: number) => Promise<void>
  onRenameStage: (stageId: number, name: string) => Promise<void>
  onDeleteStage: (stageId: number) => Promise<void>
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { type: 'stage', stage },
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
      </div>

      <div ref={setNodeRef} className="flex min-h-[120px] flex-1 flex-col gap-3 p-3.5">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {stage.tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              onEdit={() => onEditTask(task)}
              onDelete={() => void onDeleteTask(task.id)}
            />
          ))}
        </SortableContext>

        <button
          type="button"
          onClick={() => onAddTask(stage.id)}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-teal hover:bg-surface hover:text-teal"
        >
          <FiPlus size={14} aria-hidden />
          Add task
        </button>
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
  onStagesChange,
  onAddTask,
  onEditTask,
  onMoveTask,
  onDeleteTask,
  onRenameStage,
  onDeleteStage,
  onAddStage,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<ProjectTask | null>(null)
  const [stageName, setStageName] = useState('')
  const [addingStage, setAddingStage] = useState(false)
  const [stageBusy, setStageBusy] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
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
    const taskId = parseTaskId(event.active.id)
    if (taskId == null) return
    const stage = findStageByTaskId(stages, taskId)
    const task = stage?.tasks.find((item) => item.id === taskId) || null
    setActiveTask(task)
  }

  function handleDragOver(event: DragOverEvent) {
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
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onRenameStage={onRenameStage}
              onDeleteStage={onDeleteStage}
            />
          ))}

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
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
