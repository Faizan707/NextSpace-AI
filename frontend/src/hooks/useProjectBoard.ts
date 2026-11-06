import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as spacesApi from '../api/spaces'
import { queryKeys } from '../lib/queryKeys'
import type { ProjectBoard, ProjectStage, ProjectTask, SpaceProject } from '../types'
import { requireToken, useAuthToken } from './useAuthToken'

export function useProjectQuery(spaceId: number, projectId: number) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.project.detail(spaceId, projectId),
    enabled: Boolean(token) && Number.isFinite(spaceId) && Number.isFinite(projectId),
    queryFn: () => spacesApi.getProject(requireToken(token), spaceId, projectId),
  })
}

export function useProjectBoardQuery(spaceId: number, projectId: number) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.project.board(spaceId, projectId),
    enabled: Boolean(token) && Number.isFinite(spaceId) && Number.isFinite(projectId),
    queryFn: () => spacesApi.getProjectBoard(requireToken(token), spaceId, projectId),
  })
}

function invalidateBoardRelated(
  queryClient: ReturnType<typeof useQueryClient>,
  spaceId: number,
  projectId: number,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.project.board(spaceId, projectId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.project.detail(spaceId, projectId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.projects(spaceId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.work.projects })
  void queryClient.invalidateQueries({ queryKey: queryKeys.work.tasks })
}

export function useCreateTaskMutation(spaceId: number, projectId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      title: string
      description?: string | null
      stage_id: number
      priority?: ProjectTask['priority']
      assignee_id?: number | null
    }) => spacesApi.createTask(requireToken(token), spaceId, projectId, payload),
    onSuccess: (task) => {
      queryClient.setQueryData<ProjectBoard>(
        queryKeys.project.board(spaceId, projectId),
        (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            stages: prev.stages.map((stage) =>
              stage.id === task.stage_id
                ? { ...stage, tasks: [...stage.tasks, task] }
                : stage,
            ),
          }
        },
      )
      invalidateBoardRelated(queryClient, spaceId, projectId)
    },
  })
}

export function useUpdateTaskMutation(spaceId: number, projectId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: {
        title?: string
        description?: string | null
        stage_id?: number
        position?: number
        priority?: ProjectTask['priority']
        assignee_id?: number | null
      }
    }) => spacesApi.updateTask(requireToken(token), spaceId, projectId, taskId, payload),
    onSuccess: (task) => {
      queryClient.setQueryData<ProjectBoard>(
        queryKeys.project.board(spaceId, projectId),
        (prev) => {
          if (!prev) return prev
          const cleared = prev.stages.map((stage) => ({
            ...stage,
            tasks: stage.tasks.filter((item) => item.id !== task.id),
          }))
          return {
            ...prev,
            stages: cleared.map((stage) =>
              stage.id === task.stage_id
                ? { ...stage, tasks: [...stage.tasks, task] }
                : stage,
            ),
          }
        },
      )
      invalidateBoardRelated(queryClient, spaceId, projectId)
    },
  })
}

export function useDeleteTaskMutation(spaceId: number, projectId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: number) =>
      spacesApi.deleteTask(requireToken(token), spaceId, projectId, taskId),
    onSuccess: (_data, taskId) => {
      queryClient.setQueryData<ProjectBoard>(
        queryKeys.project.board(spaceId, projectId),
        (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            stages: prev.stages.map((stage) => ({
              ...stage,
              tasks: stage.tasks.filter((task) => task.id !== taskId),
            })),
          }
        },
      )
      invalidateBoardRelated(queryClient, spaceId, projectId)
    },
  })
}

export function useCreateStageMutation(spaceId: number, projectId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string }) =>
      spacesApi.createStage(requireToken(token), spaceId, projectId, payload),
    onSuccess: (stage) => {
      queryClient.setQueryData<ProjectBoard>(
        queryKeys.project.board(spaceId, projectId),
        (prev) => {
          if (!prev) return prev
          const nextStage: ProjectStage = { ...stage, tasks: stage.tasks || [] }
          return { ...prev, stages: [...prev.stages, nextStage] }
        },
      )
    },
  })
}

export function useUpdateStageMutation(spaceId: number, projectId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      stageId,
      payload,
    }: {
      stageId: number
      payload: { name?: string; position?: number }
    }) => spacesApi.updateStage(requireToken(token), spaceId, projectId, stageId, payload),
    onSuccess: (stage) => {
      queryClient.setQueryData<ProjectBoard>(
        queryKeys.project.board(spaceId, projectId),
        (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            stages: prev.stages.map((item) =>
              item.id === stage.id ? { ...item, name: stage.name, position: stage.position } : item,
            ),
          }
        },
      )
      invalidateBoardRelated(queryClient, spaceId, projectId)
    },
  })
}

export function useDeleteStageMutation(spaceId: number, projectId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stageId: number) =>
      spacesApi.deleteStage(requireToken(token), spaceId, projectId, stageId),
    onSuccess: (_data, stageId) => {
      queryClient.setQueryData<ProjectBoard>(
        queryKeys.project.board(spaceId, projectId),
        (prev) => {
          if (!prev) return prev
          return { ...prev, stages: prev.stages.filter((stage) => stage.id !== stageId) }
        },
      )
    },
  })
}

export function setBoardStages(
  queryClient: ReturnType<typeof useQueryClient>,
  spaceId: number,
  projectId: number,
  stages: ProjectStage[],
) {
  queryClient.setQueryData<ProjectBoard>(queryKeys.project.board(spaceId, projectId), (prev) => {
    if (!prev) {
      return { project_id: projectId, stages }
    }
    return { ...prev, stages }
  })
}

export type { ProjectTask, SpaceProject }
