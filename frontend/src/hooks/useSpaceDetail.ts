import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as spacesApi from '../api/spaces'
import { queryKeys } from '../lib/queryKeys'
import type { ProjectStatus, SpaceDocument, SpaceProject, SpaceTeam } from '../types'
import { requireToken, useAuthToken } from './useAuthToken'

type ProjectPayload = {
  name: string
  description?: string | null
  status?: ProjectStatus
  deadline?: string | null
  member_ids?: number[]
}

function invalidateSpaceLists(queryClient: ReturnType<typeof useQueryClient>, spaceId: number) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(spaceId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.projects(spaceId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.work.projects })
}

export function useCreateProjectMutation(spaceId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProjectPayload) =>
      spacesApi.createProject(requireToken(token), spaceId, payload),
    onSuccess: (project) => {
      queryClient.setQueryData<SpaceProject[]>(queryKeys.spaces.projects(spaceId), (prev) =>
        prev ? [project, ...prev] : [project],
      )
      invalidateSpaceLists(queryClient, spaceId)
    },
  })
}

export function useUpdateProjectMutation(spaceId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      payload,
    }: {
      projectId: number
      payload: Partial<ProjectPayload>
    }) => spacesApi.updateProject(requireToken(token), spaceId, projectId, payload),
    onSuccess: (project) => {
      queryClient.setQueryData<SpaceProject[]>(queryKeys.spaces.projects(spaceId), (prev) =>
        prev?.map((item) => (item.id === project.id ? project : item)),
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.project.detail(spaceId, project.id),
      })
      invalidateSpaceLists(queryClient, spaceId)
    },
  })
}

export function useDeleteProjectMutation(spaceId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) =>
      spacesApi.deleteProject(requireToken(token), spaceId, projectId),
    onSuccess: (_data, projectId) => {
      queryClient.setQueryData<SpaceProject[]>(queryKeys.spaces.projects(spaceId), (prev) =>
        prev?.filter((item) => item.id !== projectId),
      )
      invalidateSpaceLists(queryClient, spaceId)
      void queryClient.invalidateQueries({ queryKey: queryKeys.work.tasks })
    },
  })
}

export function useAddProjectMembersMutation(spaceId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, userIds }: { projectId: number; userIds: number[] }) =>
      spacesApi.addProjectMembers(requireToken(token), spaceId, projectId, userIds),
    onSuccess: (project) => {
      queryClient.setQueryData<SpaceProject[]>(queryKeys.spaces.projects(spaceId), (prev) =>
        prev?.map((item) => (item.id === project.id ? project : item)),
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.project.detail(spaceId, project.id),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.work.projects })
    },
  })
}

export function useCreateTeamMutation(spaceId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      name: string
      description?: string | null
      member_ids?: number[]
    }) =>
      spacesApi.createTeam(requireToken(token), spaceId, {
        name: payload.name,
        description: payload.description,
        member_ids: payload.member_ids ?? [],
      }),
    onSuccess: (team) => {
      queryClient.setQueryData<SpaceTeam[]>(queryKeys.spaces.teams(spaceId), (prev) =>
        prev ? [team, ...prev] : [team],
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(spaceId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
    },
  })
}

export function useDeleteTeamMutation(spaceId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (teamId: number) => spacesApi.deleteTeam(requireToken(token), spaceId, teamId),
    onSuccess: (_data, teamId) => {
      queryClient.setQueryData<SpaceTeam[]>(queryKeys.spaces.teams(spaceId), (prev) =>
        prev?.filter((item) => item.id !== teamId),
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(spaceId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
    },
  })
}

export function useAddTeamMembersMutation(spaceId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userIds }: { teamId: number; userIds: number[] }) =>
      spacesApi.addTeamMembers(requireToken(token), spaceId, teamId, userIds),
    onSuccess: (team) => {
      queryClient.setQueryData<SpaceTeam[]>(queryKeys.spaces.teams(spaceId), (prev) =>
        prev?.map((item) => (item.id === team.id ? team : item)),
      )
    },
  })
}

export function useUploadDocumentMutation(spaceId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File
      onProgress?: (percent: number) => void
    }) => spacesApi.uploadDocument(requireToken(token), spaceId, file, onProgress),
    onSuccess: (doc) => {
      queryClient.setQueryData<SpaceDocument[]>(queryKeys.spaces.documents(spaceId), (prev) =>
        prev ? [doc, ...prev] : [doc],
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(spaceId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
    },
  })
}

export function useDeleteDocumentMutation(spaceId: number) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: number) =>
      spacesApi.deleteDocument(requireToken(token), spaceId, documentId),
    onSuccess: (_data, documentId) => {
      queryClient.setQueryData<SpaceDocument[]>(queryKeys.spaces.documents(spaceId), (prev) =>
        prev?.filter((item) => item.id !== documentId),
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(spaceId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
    },
  })
}
