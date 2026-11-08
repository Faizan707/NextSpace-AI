import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as spacesApi from '../api/spaces'
import { queryKeys } from '../lib/queryKeys'
import type { TaskAttachment, TaskComment } from '../types'
import { requireToken, useAuthToken } from './useAuthToken'

export function useTaskDetailQuery(
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  const token = useAuthToken()
  return useQuery({
    queryKey:
      taskId != null
        ? queryKeys.project.task(spaceId, projectId, taskId)
        : ['spaces', spaceId, 'projects', projectId, 'tasks', 'none'],
    enabled:
      Boolean(token) &&
      Number.isFinite(spaceId) &&
      Number.isFinite(projectId) &&
      taskId != null,
    queryFn: () => spacesApi.getTask(requireToken(token), spaceId, projectId, taskId as number),
  })
}

export function useTaskCommentsQuery(
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  const token = useAuthToken()
  return useQuery({
    queryKey:
      taskId != null
        ? queryKeys.project.taskComments(spaceId, projectId, taskId)
        : ['spaces', spaceId, 'projects', projectId, 'tasks', 'none', 'comments'],
    enabled:
      Boolean(token) &&
      Number.isFinite(spaceId) &&
      Number.isFinite(projectId) &&
      taskId != null,
    queryFn: () =>
      spacesApi.listTaskComments(requireToken(token), spaceId, projectId, taskId as number),
  })
}

export function useTaskAttachmentsQuery(
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  const token = useAuthToken()
  return useQuery({
    queryKey:
      taskId != null
        ? queryKeys.project.taskAttachments(spaceId, projectId, taskId)
        : ['spaces', spaceId, 'projects', projectId, 'tasks', 'none', 'attachments'],
    enabled:
      Boolean(token) &&
      Number.isFinite(spaceId) &&
      Number.isFinite(projectId) &&
      taskId != null,
    queryFn: () =>
      spacesApi.listTaskAttachments(requireToken(token), spaceId, projectId, taskId as number),
  })
}

function invalidateTaskActivity(
  queryClient: ReturnType<typeof useQueryClient>,
  spaceId: number,
  projectId: number,
  taskId: number,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.project.task(spaceId, projectId, taskId),
  })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.project.taskComments(spaceId, projectId, taskId),
  })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.project.taskAttachments(spaceId, projectId, taskId),
  })
}

function invalidateComments(
  queryClient: ReturnType<typeof useQueryClient>,
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  if (taskId == null) return
  void queryClient.invalidateQueries({
    queryKey: queryKeys.project.taskComments(spaceId, projectId, taskId),
  })
}

export function useCreateTaskCommentMutation(
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { body: string; mention_ids?: number[] }) => {
      if (taskId == null) throw new Error('No task selected')
      return spacesApi.createTaskComment(
        requireToken(token),
        spaceId,
        projectId,
        taskId,
        payload,
      )
    },
    onSuccess: () => invalidateComments(queryClient, spaceId, projectId, taskId),
  })
}

export function useReplyToCommentMutation(
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      commentId,
      body,
      mention_ids,
    }: {
      commentId: number
      body: string
      mention_ids?: number[]
    }) => {
      if (taskId == null) throw new Error('No task selected')
      return spacesApi.replyToTaskComment(
        requireToken(token),
        spaceId,
        projectId,
        taskId,
        commentId,
        { body, mention_ids },
      )
    },
    onSuccess: () => invalidateComments(queryClient, spaceId, projectId, taskId),
  })
}

export function useReplyToReplyMutation(
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      replyId,
      body,
      mention_ids,
    }: {
      replyId: number
      body: string
      mention_ids?: number[]
    }) => {
      if (taskId == null) throw new Error('No task selected')
      return spacesApi.replyToTaskReply(
        requireToken(token),
        spaceId,
        projectId,
        taskId,
        replyId,
        { body, mention_ids },
      )
    },
    onSuccess: () => invalidateComments(queryClient, spaceId, projectId, taskId),
  })
}

export function useDeleteTaskCommentMutation(
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) =>
      spacesApi.deleteTaskComment(requireToken(token), spaceId, projectId, commentId),
    onSuccess: () => {
      if (taskId == null) return
      void queryClient.invalidateQueries({
        queryKey: queryKeys.project.taskComments(spaceId, projectId, taskId),
      })
    },
  })
}

export function useUploadTaskAttachmentMutation(
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File
      onProgress?: (percent: number) => void
    }) => {
      if (taskId == null) throw new Error('No task selected')
      return spacesApi.uploadTaskAttachment(
        requireToken(token),
        spaceId,
        projectId,
        taskId,
        file,
        onProgress,
      )
    },
    onSuccess: (attachment: TaskAttachment) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.project.taskAttachments(spaceId, projectId, attachment.task_id),
      })
      if (taskId != null) {
        invalidateTaskActivity(queryClient, spaceId, projectId, taskId)
      }
    },
  })
}

export function useDeleteTaskAttachmentMutation(
  spaceId: number,
  projectId: number,
  taskId: number | null,
) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: number) =>
      spacesApi.deleteTaskAttachment(requireToken(token), spaceId, projectId, attachmentId),
    onSuccess: () => {
      if (taskId == null) return
      void queryClient.invalidateQueries({
        queryKey: queryKeys.project.taskAttachments(spaceId, projectId, taskId),
      })
    },
  })
}

export type { TaskAttachment, TaskComment }
