import { apiDownloadUrl, apiRequest, apiUpload } from './client'
import type {
  ProjectBoard,
  ProjectStage,
  ProjectTask,
  Space,
  SpaceCreator,
  SpaceDocument,
  SpacePayload,
  SpaceProject,
  SpaceTeam,
  TaskAttachment,
  TaskComment,
  TaskDetail,
} from '../types'

export function listSpaces(token: string) {
  return apiRequest<Space[]>('/spaces', { token })
}

export function getSpace(token: string, spaceId: number) {
  return apiRequest<Space>(`/spaces/${spaceId}`, { token })
}

export function createSpace(token: string, payload: SpacePayload) {
  return apiRequest<Space>('/spaces', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateSpace(token: string, spaceId: number, payload: Partial<SpacePayload>) {
  return apiRequest<Space>(`/spaces/${spaceId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function deleteSpace(token: string, spaceId: number) {
  return apiRequest<void>(`/spaces/${spaceId}`, {
    method: 'DELETE',
    token,
  })
}

export function listSpaceMembers(token: string, spaceId: number) {
  return apiRequest<SpaceCreator[]>(`/spaces/${spaceId}/members`, { token })
}

export function addSpaceMembers(token: string, spaceId: number, userIds: number[]) {
  return apiRequest<Space>(`/spaces/${spaceId}/members`, {
    method: 'POST',
    token,
    body: { user_ids: userIds },
  })
}

export function removeSpaceMember(token: string, spaceId: number, userId: number) {
  return apiRequest<Space>(`/spaces/${spaceId}/members/${userId}`, {
    method: 'DELETE',
    token,
  })
}

export function listProjects(token: string, spaceId: number) {
  return apiRequest<SpaceProject[]>(`/spaces/${spaceId}/projects`, { token })
}

export function createProject(
  token: string,
  spaceId: number,
  payload: {
    name: string
    description?: string | null
    status?: SpaceProject['status']
    progress?: number
    deadline?: string | null
    member_ids?: number[]
  },
) {
  return apiRequest<SpaceProject>(`/spaces/${spaceId}/projects`, {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateProject(
  token: string,
  spaceId: number,
  projectId: number,
  payload: {
    name?: string
    description?: string | null
    status?: SpaceProject['status']
    progress?: number
    deadline?: string | null
  },
) {
  return apiRequest<SpaceProject>(`/spaces/${spaceId}/projects/${projectId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function addProjectMembers(
  token: string,
  spaceId: number,
  projectId: number,
  payload: { userIds?: number[]; teamIds?: number[] },
) {
  return apiRequest<SpaceProject>(`/spaces/${spaceId}/projects/${projectId}/members`, {
    method: 'POST',
    token,
    body: {
      user_ids: payload.userIds ?? [],
      team_ids: payload.teamIds ?? [],
    },
  })
}

export function removeProjectMember(
  token: string,
  spaceId: number,
  projectId: number,
  userId: number,
) {
  return apiRequest<SpaceProject>(`/spaces/${spaceId}/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
    token,
  })
}

export function deleteProject(token: string, spaceId: number, projectId: number) {
  return apiRequest<void>(`/spaces/${spaceId}/projects/${projectId}`, {
    method: 'DELETE',
    token,
  })
}

export function getProject(token: string, spaceId: number, projectId: number) {
  return apiRequest<SpaceProject>(`/spaces/${spaceId}/projects/${projectId}`, { token })
}

export function getProjectBoard(token: string, spaceId: number, projectId: number) {
  return apiRequest<ProjectBoard>(`/spaces/${spaceId}/projects/${projectId}/board`, { token })
}

export function createStage(
  token: string,
  spaceId: number,
  projectId: number,
  payload: { name: string },
) {
  return apiRequest<ProjectStage>(`/spaces/${spaceId}/projects/${projectId}/stages`, {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateStage(
  token: string,
  spaceId: number,
  projectId: number,
  stageId: number,
  payload: { name?: string; position?: number },
) {
  return apiRequest<ProjectStage>(`/spaces/${spaceId}/projects/${projectId}/stages/${stageId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function deleteStage(token: string, spaceId: number, projectId: number, stageId: number) {
  return apiRequest<void>(`/spaces/${spaceId}/projects/${projectId}/stages/${stageId}`, {
    method: 'DELETE',
    token,
  })
}

export function createTask(
  token: string,
  spaceId: number,
  projectId: number,
  payload: {
    title: string
    description?: string | null
    stage_id: number
    priority?: ProjectTask['priority']
    assignee_id?: number | null
  },
) {
  return apiRequest<ProjectTask>(`/spaces/${spaceId}/projects/${projectId}/tasks`, {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateTask(
  token: string,
  spaceId: number,
  projectId: number,
  taskId: number,
  payload: {
    title?: string
    description?: string | null
    stage_id?: number
    position?: number
    priority?: ProjectTask['priority']
    assignee_id?: number | null
  },
) {
  return apiRequest<ProjectTask>(`/spaces/${spaceId}/projects/${projectId}/tasks/${taskId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function deleteTask(token: string, spaceId: number, projectId: number, taskId: number) {
  return apiRequest<void>(`/spaces/${spaceId}/projects/${projectId}/tasks/${taskId}`, {
    method: 'DELETE',
    token,
  })
}

export function getTask(token: string, spaceId: number, projectId: number, taskId: number) {
  return apiRequest<TaskDetail>(`/spaces/${spaceId}/projects/${projectId}/tasks/${taskId}`, {
    token,
  })
}

export function listTaskComments(
  token: string,
  spaceId: number,
  projectId: number,
  taskId: number,
) {
  return apiRequest<TaskComment[]>(
    `/spaces/${spaceId}/projects/${projectId}/tasks/${taskId}/comments`,
    { token },
  )
}

export function createTaskComment(
  token: string,
  spaceId: number,
  projectId: number,
  taskId: number,
  payload: { body: string; mention_ids?: number[] },
) {
  return apiRequest<TaskComment>(
    `/spaces/${spaceId}/projects/${projectId}/tasks/${taskId}/comments`,
    {
      method: 'POST',
      token,
      body: payload,
    },
  )
}

export function replyToTaskComment(
  token: string,
  spaceId: number,
  projectId: number,
  taskId: number,
  commentId: number,
  payload: { body: string; mention_ids?: number[] },
) {
  return apiRequest<TaskComment>(
    `/spaces/${spaceId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}/replies`,
    {
      method: 'POST',
      token,
      body: payload,
    },
  )
}

export function replyToTaskReply(
  token: string,
  spaceId: number,
  projectId: number,
  taskId: number,
  replyId: number,
  payload: { body: string; mention_ids?: number[] },
) {
  return apiRequest<TaskComment>(
    `/spaces/${spaceId}/projects/${projectId}/tasks/${taskId}/replies/${replyId}/replies`,
    {
      method: 'POST',
      token,
      body: payload,
    },
  )
}

export function deleteTaskComment(
  token: string,
  spaceId: number,
  projectId: number,
  commentId: number,
) {
  return apiRequest<void>(`/spaces/${spaceId}/projects/${projectId}/comments/${commentId}`, {
    method: 'DELETE',
    token,
  })
}

export function listTaskAttachments(
  token: string,
  spaceId: number,
  projectId: number,
  taskId: number,
) {
  return apiRequest<TaskAttachment[]>(
    `/spaces/${spaceId}/projects/${projectId}/tasks/${taskId}/attachments`,
    { token },
  )
}

export function uploadTaskAttachment(
  token: string,
  spaceId: number,
  projectId: number,
  taskId: number,
  file: File,
  onProgress?: (percent: number) => void,
) {
  return apiUpload<TaskAttachment>(
    `/spaces/${spaceId}/projects/${projectId}/tasks/${taskId}/attachments`,
    file,
    token,
    'file',
    onProgress,
  )
}

export function deleteTaskAttachment(
  token: string,
  spaceId: number,
  projectId: number,
  attachmentId: number,
) {
  return apiRequest<void>(`/spaces/${spaceId}/projects/${projectId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    token,
  })
}

export function taskAttachmentDownloadUrl(
  spaceId: number,
  projectId: number,
  attachmentId: number,
) {
  return apiDownloadUrl(
    `/spaces/${spaceId}/projects/${projectId}/attachments/${attachmentId}/download`,
  )
}

export function listTeams(token: string, spaceId: number) {
  return apiRequest<SpaceTeam[]>(`/spaces/${spaceId}/teams`, { token })
}

export function createTeam(
  token: string,
  spaceId: number,
  payload: { name: string; description?: string | null; member_ids: number[] },
) {
  return apiRequest<SpaceTeam>(`/spaces/${spaceId}/teams`, {
    method: 'POST',
    token,
    body: payload,
  })
}

export function deleteTeam(token: string, spaceId: number, teamId: number) {
  return apiRequest<void>(`/spaces/${spaceId}/teams/${teamId}`, {
    method: 'DELETE',
    token,
  })
}

export function addTeamMembers(
  token: string,
  spaceId: number,
  teamId: number,
  userIds: number[],
) {
  return apiRequest<SpaceTeam>(`/spaces/${spaceId}/teams/${teamId}/members`, {
    method: 'POST',
    token,
    body: { user_ids: userIds },
  })
}

export function listDocuments(token: string, spaceId: number) {
  return apiRequest<SpaceDocument[]>(`/spaces/${spaceId}/documents`, { token })
}

export function uploadDocument(
  token: string,
  spaceId: number,
  file: File,
  onProgress?: (percent: number) => void,
) {
  return apiUpload<SpaceDocument>(`/spaces/${spaceId}/documents`, file, token, 'file', onProgress)
}

export function addDocumentMembers(
  token: string,
  spaceId: number,
  documentId: number,
  userIds: number[],
) {
  return apiRequest<SpaceDocument>(`/spaces/${spaceId}/documents/${documentId}/members`, {
    method: 'POST',
    token,
    body: { user_ids: userIds },
  })
}

export function removeDocumentMember(
  token: string,
  spaceId: number,
  documentId: number,
  userId: number,
) {
  return apiRequest<SpaceDocument>(
    `/spaces/${spaceId}/documents/${documentId}/members/${userId}`,
    {
      method: 'DELETE',
      token,
    },
  )
}

export function deleteDocument(token: string, spaceId: number, documentId: number) {
  return apiRequest<void>(`/spaces/${spaceId}/documents/${documentId}`, {
    method: 'DELETE',
    token,
  })
}

export function runDocumentComplianceCheck(
  token: string,
  spaceId: number,
  documentId: number,
) {
  return apiRequest<SpaceDocument>(
    `/spaces/${spaceId}/documents/${documentId}/compliance-check`,
    {
      method: 'POST',
      token,
    },
  )
}

export function documentDownloadUrl(spaceId: number, documentId: number) {
  return apiDownloadUrl(`/spaces/${spaceId}/documents/${documentId}/download`)
}
