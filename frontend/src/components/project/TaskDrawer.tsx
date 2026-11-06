import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Drawer, Input, Select, Textarea } from '../ui'
import type { ProjectStage, ProjectTask, SpaceCreator, TaskPriority } from '../../types'

export interface TaskFormPayload {
  title: string
  description: string | null
  stage_id: number
  priority: TaskPriority
  assignee_id: number | null
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

interface TaskDrawerProps {
  open: boolean
  stages: ProjectStage[]
  members: SpaceCreator[]
  initialStageId?: number | null
  editing?: ProjectTask | null
  submitting?: boolean
  onClose: () => void
  onSubmit: (payload: TaskFormPayload) => Promise<void>
}

export function TaskDrawer({
  open,
  stages,
  members,
  initialStageId,
  editing,
  submitting = false,
  onClose,
  onSubmit,
}: TaskDrawerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stageId, setStageId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const stageOptions = useMemo(
    () => stages.map((stage) => ({ value: String(stage.id), label: stage.name })),
    [stages],
  )

  const assigneeOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...members.map((member) => ({
        value: String(member.id),
        label: member.full_name || member.email,
      })),
    ],
    [members],
  )

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setTitle(editing.title)
      setDescription(editing.description || '')
      setStageId(String(editing.stage_id))
      setPriority(editing.priority || 'medium')
      setAssigneeId(editing.assignee_id != null ? String(editing.assignee_id) : '')
      return
    }
    setTitle('')
    setDescription('')
    setStageId(
      initialStageId != null
        ? String(initialStageId)
        : stages[0]
          ? String(stages[0].id)
          : '',
    )
    setPriority('medium')
    setAssigneeId('')
  }, [open, editing, initialStageId, stages])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Title is required')
      return
    }
    if (!stageId) {
      setError('Choose a stage')
      return
    }
    setError(null)
    try {
      await onSubmit({
        title: trimmed,
        description: description.trim() || null,
        stage_id: Number(stageId),
        priority,
        assignee_id: assigneeId ? Number(assigneeId) : null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task')
    }
  }

  return (
    <Drawer
      open={open}
      eyebrow="Tasks"
      title={editing ? 'Edit task' : 'Add task'}
      description={
        editing
          ? 'Update the task details and stage.'
          : 'Add a title, optional details, and assignee.'
      }
      onClose={onClose}
    >
      <form className="flex flex-1 flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        {error ? <Alert>{error}</Alert> : null}

        <Input
          id="task-title"
          label="Title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to be done?"
        />

        <Textarea
          id="task-description"
          label="Description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional details, acceptance criteria, notes…"
        />

        <Select
          id="task-stage"
          label="Stage"
          required
          value={stageId}
          onChange={setStageId}
          options={stageOptions}
          placeholder="Select stage"
        />

        <Select
          id="task-priority"
          label="Priority"
          required
          value={priority}
          onChange={(value) => setPriority(value as TaskPriority)}
          options={PRIORITY_OPTIONS}
        />

        <Select
          id="task-assignee"
          label="Assignee"
          value={assigneeId}
          onChange={setAssigneeId}
          options={assigneeOptions}
          placeholder="Unassigned"
          hint="Only project members can be assigned."
        />

        <div className="mt-auto flex gap-3 border-t border-line pt-5">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-[1.3]" disabled={submitting || !title.trim()}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
