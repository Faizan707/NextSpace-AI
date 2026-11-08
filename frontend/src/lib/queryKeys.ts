export const queryKeys = {
  company: {
    me: ['company', 'me'] as const,
    members: ['company', 'members'] as const,
  },
  spaces: {
    all: ['spaces'] as const,
    detail: (spaceId: number) => ['spaces', spaceId] as const,
    projects: (spaceId: number) => ['spaces', spaceId, 'projects'] as const,
    teams: (spaceId: number) => ['spaces', spaceId, 'teams'] as const,
    documents: (spaceId: number) => ['spaces', spaceId, 'documents'] as const,
  },
  project: {
    detail: (spaceId: number, projectId: number) =>
      ['spaces', spaceId, 'projects', projectId] as const,
    board: (spaceId: number, projectId: number) =>
      ['spaces', spaceId, 'projects', projectId, 'board'] as const,
    task: (spaceId: number, projectId: number, taskId: number) =>
      ['spaces', spaceId, 'projects', projectId, 'tasks', taskId] as const,
    taskComments: (spaceId: number, projectId: number, taskId: number) =>
      ['spaces', spaceId, 'projects', projectId, 'tasks', taskId, 'comments'] as const,
    taskAttachments: (spaceId: number, projectId: number, taskId: number) =>
      ['spaces', spaceId, 'projects', projectId, 'tasks', taskId, 'attachments'] as const,
  },
  work: {
    projects: ['work', 'projects'] as const,
    tasks: ['work', 'tasks'] as const,
  },
  admin: {
    overview: ['admin', 'overview'] as const,
    invites: ['admin', 'invites'] as const,
  },
}
