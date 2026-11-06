import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '../api/admin'
import type { AdminMember } from '../api/admin'
import { queryKeys } from '../lib/queryKeys'
import type { InviteCreatePayload } from '../types'
import { requireToken, useAuthToken } from './useAuthToken'

export function useAdminOverviewQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.admin.overview,
    enabled: Boolean(token),
    queryFn: () => adminApi.getOverview(requireToken(token)),
  })
}

export function useAdminInvitesQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.admin.invites,
    enabled: Boolean(token),
    queryFn: () => adminApi.listInvites(requireToken(token)),
  })
}

export function useCreateInviteMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteCreatePayload) =>
      adminApi.createInvite(requireToken(token), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.invites })
      void queryClient.invalidateQueries({ queryKey: queryKeys.company.members })
    },
  })
}

export function useRevokeInviteMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: number) => adminApi.revokeInvite(requireToken(token), inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.invites })
    },
  })
}

export function useUpdateAdminUserMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number
      payload: { full_name?: string | null; job_role?: string | null }
    }) => adminApi.updateUser(requireToken(token), userId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.admin.overview, (prev: adminApi.AdminOverview | undefined) => {
        if (!prev) return prev
        return {
          ...prev,
          users: prev.users.map((user: AdminMember) =>
            user.id === updated.id ? updated : user,
          ),
        }
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview })
      void queryClient.invalidateQueries({ queryKey: queryKeys.company.members })
    },
  })
}

export function useRevokeUserAccessMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => adminApi.revokeUserAccess(requireToken(token), userId),
    onSuccess: (_data, userId) => {
      queryClient.setQueryData(queryKeys.admin.overview, (prev: adminApi.AdminOverview | undefined) => {
        if (!prev) return prev
        return {
          ...prev,
          users: prev.users.filter((user: AdminMember) => user.id !== userId),
        }
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview })
      void queryClient.invalidateQueries({ queryKey: queryKeys.company.members })
    },
  })
}
