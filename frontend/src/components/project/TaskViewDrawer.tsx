import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import {
  FiCalendar,
  FiClock,
  FiEdit2,
  FiFile,
  FiFlag,
  FiLayers,
  FiPaperclip,
  FiSend,
  FiTrash2,
  FiUser,
} from 'react-icons/fi'
import { Avatar } from '../Avatar'
import { Alert, Button, Drawer } from '../ui'
import { taskAttachmentDownloadUrl } from '../../api/spaces'
import {
  useCreateTaskCommentMutation,
  useDeleteTaskAttachmentMutation,
  useDeleteTaskCommentMutation,
  useReplyToCommentMutation,
  useReplyToReplyMutation,
  useTaskAttachmentsQuery,
  useTaskCommentsQuery,
  useTaskDetailQuery,
  useUploadTaskAttachmentMutation,
} from '../../hooks'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../stores/toastStore'
import type { SpaceCreator, TaskAttachment, TaskComment, TaskPriority } from '../../types'
import { cn } from '../../lib/cn'

interface TaskViewDrawerProps {
  open: boolean
  spaceId: number
  projectId: number
  taskId: number | null
  members: SpaceCreator[]
  onClose: () => void
  onEdit?: () => void
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function priorityMeta(priority: TaskPriority | undefined) {
  if (priority === 'high') return { label: 'High', className: 'text-danger bg-danger-soft' }
  if (priority === 'low') return { label: 'Low', className: 'text-muted bg-bg-elevated' }
  return { label: 'Medium', className: 'text-[#c2410c] bg-[#ffedd5]' }
}

function personLabel(person: SpaceCreator | null | undefined) {
  if (!person) return '—'
  return person.full_name || person.email
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderCommentBody(body: string, members: SpaceCreator[]) {
  const names = members
    .map((member) => member.full_name || member.email)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

  if (names.length === 0) return body

  const pattern = new RegExp(`@(${names.map(escapeRegExp).join('|')})`, 'gi')
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index))
    }
    parts.push(
      <span key={`m-${key++}`} className="font-semibold text-accent">
        {match[0]}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex))
  }

  return parts.length > 0 ? parts : body
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-start gap-3 py-2.5">
      <div className="flex items-center gap-2 text-[0.8rem] font-medium text-muted">
        <span className="grid size-5 place-items-center text-muted">{icon}</span>
        {label}
      </div>
      <div className="min-w-0 text-[0.85rem] text-ink">{children}</div>
    </div>
  )
}

function CommentItem({
  comment,
  members,
  currentUserId,
  isOwner,
  onReply,
  onDelete,
  depth = 0,
}: {
  comment: TaskComment
  members: SpaceCreator[]
  currentUserId?: number
  isOwner?: boolean
  onReply: (comment: TaskComment) => void
  onDelete: (commentId: number) => void
  depth?: number
}) {
  const canDelete = currentUserId === comment.author_id || Boolean(isOwner)
  return (
    <div className={cn(depth > 0 && 'ml-8 border-l border-line pl-4')}>
      <div className="flex gap-3 py-3">
        <Avatar
          name={comment.author.full_name}
          email={comment.author.email}
          imageUrl={comment.author.avatar_url}
          className="size-8 shrink-0 text-xs ring-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-ink">
              {personLabel(comment.author)}
            </span>
            <span className="text-[0.72rem] text-muted">{formatDateTime(comment.created_at)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
            {renderCommentBody(comment.body, members)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            {depth < 2 ? (
              <button
                type="button"
                onClick={() => onReply(comment)}
                className="cursor-pointer text-[0.75rem] font-semibold text-muted hover:text-accent"
              >
                Reply
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="cursor-pointer text-[0.75rem] font-semibold text-muted hover:text-danger"
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          members={members}
          currentUserId={currentUserId}
          isOwner={isOwner}
          onReply={onReply}
          onDelete={onDelete}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export function TaskViewDrawer({
  open,
  spaceId,
  projectId,
  taskId,
  members,
  onClose,
  onEdit,
}: TaskViewDrawerProps) {
  const token = useAuthStore((s) => s.token)
  const currentUser = useAuthStore((s) => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [draft, setDraft] = useState('')
  const [mentionIds, setMentionIds] = useState<number[]>([])
  const [replyTo, setReplyTo] = useState<{ item: TaskComment; kind: 'comment' | 'reply' } | null>(
    null,
  )
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)

  const taskQuery = useTaskDetailQuery(spaceId, projectId, open ? taskId : null)
  const commentsQuery = useTaskCommentsQuery(spaceId, projectId, open ? taskId : null)
  const attachmentsQuery = useTaskAttachmentsQuery(spaceId, projectId, open ? taskId : null)
  const createComment = useCreateTaskCommentMutation(spaceId, projectId, taskId)
  const replyToComment = useReplyToCommentMutation(spaceId, projectId, taskId)
  const replyToReply = useReplyToReplyMutation(spaceId, projectId, taskId)
  const deleteComment = useDeleteTaskCommentMutation(spaceId, projectId, taskId)
  const uploadAttachment = useUploadTaskAttachmentMutation(spaceId, projectId, taskId)
  const deleteAttachment = useDeleteTaskAttachmentMutation(spaceId, projectId, taskId)

  const task = taskQuery.data ?? null
  const comments = commentsQuery.data ?? []
  const attachments = attachmentsQuery.data ?? []

  useEffect(() => {
    if (!open) {
      setDraft('')
      setMentionIds([])
      setReplyTo(null)
      setMentionOpen(false)
      setMentionQuery('')
      setUploadPercent(null)
    }
  }, [open, taskId])

  const filteredMembers = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase()
    return members.filter((member) => {
      const label = (member.full_name || member.email).toLowerCase()
      return !q || label.includes(q)
    })
  }, [members, mentionQuery])

  const priority = priorityMeta(task?.priority)

  function detectMention(value: string, caret: number) {
    const before = value.slice(0, caret)
    const match = before.match(/@([^\s@]*)$/)
    if (!match) {
      setMentionOpen(false)
      setMentionQuery('')
      return
    }
    setMentionOpen(true)
    setMentionQuery(match[1] || '')
  }

  function insertMention(member: SpaceCreator) {
    const el = textareaRef.current
    const caret = el?.selectionStart ?? draft.length
    const before = draft.slice(0, caret)
    const after = draft.slice(caret)
    const match = before.match(/@([^\s@]*)$/)
    const label = member.full_name || member.email
    const replaced = match
      ? `${before.slice(0, before.length - match[0].length)}@${label} `
      : `${before}@${label} `
    setDraft(replaced + after)
    setMentionIds((prev) => (prev.includes(member.id) ? prev : [...prev, member.id]))
    setMentionOpen(false)
    setMentionQuery('')
    requestAnimationFrame(() => {
      if (!el) return
      const pos = replaced.length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  function startReply(item: TaskComment) {
    // Top-level comment → reply-to-comment route
    // First-level reply → reply-to-reply route
    if (item.parent_id == null) {
      setReplyTo({ item, kind: 'comment' })
    } else {
      setReplyTo({ item, kind: 'reply' })
    }
  }

  async function handleSubmitComment(event?: FormEvent) {
    event?.preventDefault()
    const body = draft.trim()
    if (!body || taskId == null) return
    try {
      if (replyTo?.kind === 'comment') {
        await replyToComment.mutateAsync({
          commentId: replyTo.item.id,
          body,
          mention_ids: mentionIds,
        })
        toast.success('Reply posted')
      } else if (replyTo?.kind === 'reply') {
        await replyToReply.mutateAsync({
          replyId: replyTo.item.id,
          body,
          mention_ids: mentionIds,
        })
        toast.success('Reply posted')
      } else {
        await createComment.mutateAsync({
          body,
          mention_ids: mentionIds,
        })
        toast.success('Comment posted')
      }
      setDraft('')
      setMentionIds([])
      setReplyTo(null)
    } catch (err) {
      toast.error('Failed to post comment', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!window.confirm('Delete this comment?')) return
    try {
      await deleteComment.mutateAsync(commentId)
      toast.success('Comment deleted')
    } catch (err) {
      toast.error('Failed to delete comment', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleUpload(file: File) {
    try {
      setUploadPercent(0)
      await uploadAttachment.mutateAsync({
        file,
        onProgress: (percent) => setUploadPercent(percent),
      })
      toast.success('Attachment uploaded', file.name)
    } catch (err) {
      toast.error('Upload failed', err instanceof Error ? err.message : undefined)
    } finally {
      setUploadPercent(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteAttachment(attachment: TaskAttachment) {
    if (!window.confirm(`Delete ${attachment.original_name}?`)) return
    try {
      await deleteAttachment.mutateAsync(attachment.id)
      toast.success('Attachment deleted')
    } catch (err) {
      toast.error('Failed to delete attachment', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleDownload(attachment: TaskAttachment) {
    if (!token) return
    try {
      const response = await fetch(
        taskAttachmentDownloadUrl(spaceId, projectId, attachment.id),
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.original_name
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Download failed', err instanceof Error ? err.message : undefined)
    }
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen && filteredMembers.length > 0 && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      insertMention(filteredMembers[0])
      return
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void handleSubmitComment()
    }
  }

  const loading = open && taskId != null && taskQuery.isLoading && !task
  const error = taskQuery.error ? (taskQuery.error as Error).message : null

  return (
    <Drawer
      open={open}
      size="lg"
      eyebrow="Task"
      title={task?.title || (loading ? 'Loading…' : 'Task')}
      onClose={onClose}
      headerExtra={
        task && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
          >
            <FiEdit2 size={12} aria-hidden />
            Edit task
          </button>
        ) : null
      }
      footer={
        onEdit ? (
        <form className="relative space-y-2" onSubmit={(event) => void handleSubmitComment(event)}>
          {replyTo ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-bg-elevated px-3 py-2 text-xs text-muted">
              <span>
                Replying to{' '}
                <strong className="text-ink">{personLabel(replyTo.item.author)}</strong>
              </span>
              <button
                type="button"
                className="cursor-pointer font-semibold text-accent"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </button>
            </div>
          ) : null}

          {mentionOpen && filteredMembers.length > 0 ? (
            <div className="absolute bottom-full left-0 z-20 mb-2 max-h-40 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
              {filteredMembers.slice(0, 8).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertMention(member)}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-elevated"
                >
                  <Avatar
                    name={member.full_name}
                    email={member.email}
                    imageUrl={member.avatar_url}
                    className="size-6 text-[0.65rem] ring-1"
                  />
                  <span className="truncate font-medium text-ink">
                    {member.full_name || member.email}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              rows={2}
              placeholder="Write a comment… Use @ to mention"
              onChange={(event) => {
                const value = event.target.value
                setDraft(value)
                detectMention(value, event.target.selectionStart)
              }}
              onKeyDown={onDraftKeyDown}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="button"
              title="Attach file"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-line text-muted transition hover:bg-bg-elevated hover:text-ink"
            >
              <FiPaperclip size={16} aria-hidden />
            </button>
            <Button
              type="submit"
              size="icon"
              disabled={
                !draft.trim() ||
                createComment.isPending ||
                replyToComment.isPending ||
                replyToReply.isPending
              }
              aria-label="Post comment"
            >
              <FiSend size={15} aria-hidden />
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleUpload(file)
            }}
          />
          {uploadPercent != null ? (
            <p className="text-xs text-muted">Uploading… {uploadPercent}%</p>
          ) : null}
        </form>
        ) : null
      }
    >
      {error ? <Alert>{error}</Alert> : null}
      {loading ? <p className="text-sm text-muted">Loading task…</p> : null}

      {task ? (
        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Description
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
              {task.description?.trim() || 'No description'}
            </p>
          </section>

          <section className="rounded-xl border border-line bg-bg-elevated/40 px-4 py-1">
            <h3 className="pt-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Details
            </h3>
            <div className="divide-y divide-line">
              <DetailRow icon={<FiCalendar size={14} />} label="Creation date">
                {formatDateTime(task.created_at)}
              </DetailRow>
              <DetailRow icon={<FiFlag size={14} />} label="Priority">
                <span
                  className={cn(
                    'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold',
                    priority.className,
                  )}
                >
                  {priority.label}
                </span>
              </DetailRow>
              <DetailRow icon={<FiLayers size={14} />} label="Status">
                <span className="inline-flex rounded-md bg-teal-soft px-2 py-0.5 text-xs font-semibold text-teal">
                  {task.stage_name}
                </span>
              </DetailRow>
              <DetailRow icon={<FiUser size={14} />} label="Assignee">
                {task.assignee ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar
                      name={task.assignee.full_name}
                      email={task.assignee.email}
                      imageUrl={task.assignee.avatar_url}
                      className="size-6 text-[0.65rem] ring-1"
                    />
                    {personLabel(task.assignee)}
                  </span>
                ) : (
                  'Unassigned'
                )}
              </DetailRow>
              <DetailRow icon={<FiUser size={14} />} label="Reporter">
                <span className="inline-flex items-center gap-2">
                  <Avatar
                    name={task.created_by.full_name}
                    email={task.created_by.email}
                    imageUrl={task.created_by.avatar_url}
                    className="size-6 text-[0.65rem] ring-1"
                  />
                  {personLabel(task.created_by)}
                </span>
              </DetailRow>
              <DetailRow icon={<FiClock size={14} />} label="Last modified">
                {formatDateTime(task.updated_at)}
              </DetailRow>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                Attachments
              </h3>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              >
                <FiPaperclip size={12} aria-hidden />
                Upload
              </button>
            </div>
            {attachmentsQuery.isLoading ? (
              <p className="mt-3 text-sm text-muted">Loading attachments…</p>
            ) : attachments.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No attachments yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg-elevated text-muted">
                      <FiFile size={16} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => void handleDownload(attachment)}
                        className="block max-w-full cursor-pointer truncate text-left text-sm font-semibold text-ink hover:text-accent"
                      >
                        {attachment.original_name}
                      </button>
                      <p className="m-0 text-[0.72rem] text-muted">
                        {formatBytes(attachment.size_bytes)} · {formatDateTime(attachment.created_at)}
                      </p>
                    </div>
                    {(currentUser?.id === attachment.uploaded_by_id ||
                      currentUser?.role === 'tenant_owner') && (
                      <button
                        type="button"
                        title="Delete attachment"
                        aria-label={`Delete ${attachment.original_name}`}
                        onClick={() => void handleDeleteAttachment(attachment)}
                        className="grid size-8 cursor-pointer place-items-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger"
                      >
                        <FiTrash2 size={14} aria-hidden />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Comments
            </h3>
            {commentsQuery.isLoading ? (
              <p className="mt-3 text-sm text-muted">Loading comments…</p>
            ) : comments.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No comments yet. Start the thread below.</p>
            ) : (
              <div className="mt-1 divide-y divide-line">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    members={members}
                    currentUserId={currentUser?.id}
                    isOwner={currentUser?.role === 'tenant_owner'}
                    onReply={startReply}
                    onDelete={(id) => void handleDeleteComment(id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  )
}
