import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as spacesApi from '../api/spaces'
import { queryKeys } from '../lib/queryKeys'
import type { SpacePayload } from '../types'
import { requireToken, useAuthToken } from './useAuthToken'

export function useSpacesQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.spaces.all,
    enabled: Boolean(token),
    queryFn: () => spacesApi.listSpaces(requireToken(token)),
  })
}

export function useSpaceQuery(spaceId: number) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.spaces.detail(spaceId),
    enabled: Boolean(token) && Number.isFinite(spaceId),
    queryFn: () => spacesApi.getSpace(requireToken(token), spaceId),
  })
}

export function useSpaceProjectsQuery(spaceId: number) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.spaces.projects(spaceId),
    enabled: Boolean(token) && Number.isFinite(spaceId),
    queryFn: () => spacesApi.listProjects(requireToken(token), spaceId),
  })
}

export function useSpaceTeamsQuery(spaceId: number) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.spaces.teams(spaceId),
    enabled: Boolean(token) && Number.isFinite(spaceId),
    queryFn: () => spacesApi.listTeams(requireToken(token), spaceId),
  })
}

export function useSpaceDocumentsQuery(spaceId: number) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.spaces.documents(spaceId),
    enabled: Boolean(token) && Number.isFinite(spaceId),
    queryFn: () => spacesApi.listDocuments(requireToken(token), spaceId),
  })
}

export function useCreateSpaceMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SpacePayload) =>
      spacesApi.createSpace(requireToken(token), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview })
    },
  })
}

export function useUpdateSpaceMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<SpacePayload> }) =>
      spacesApi.updateSpace(requireToken(token), id, payload),
    onSuccess: (space) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(space.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview })
    },
  })
}

export function useDeleteSpaceMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => spacesApi.deleteSpace(requireToken(token), id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview })
      void queryClient.invalidateQueries({ queryKey: queryKeys.work.projects })
      void queryClient.invalidateQueries({ queryKey: queryKeys.work.tasks })
    },
  })
}

export function useAddSpaceMembersMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ spaceId, userIds }: { spaceId: number; userIds: number[] }) =>
      spacesApi.addSpaceMembers(requireToken(token), spaceId, userIds),
    onSuccess: (space) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(space.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview })
    },
  })
}

export function useRemoveSpaceMemberMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ spaceId, userId }: { spaceId: number; userId: number }) =>
      spacesApi.removeSpaceMember(requireToken(token), spaceId, userId),
    onSuccess: (space) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(space.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.projects(space.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.spaces.teams(space.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.work.projects })
    },
  })
}
