import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as inboxApi from '../api/inbox'
import { queryKeys } from '../lib/queryKeys'
import type { AppNotification } from '../types'
import { requireToken, useAuthToken } from './useAuthToken'

export function useNotificationsQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.notifications.list,
    enabled: Boolean(token),
    queryFn: () => inboxApi.listNotifications(requireToken(token)),
  })
}

export function useUnreadNotificationCountQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    enabled: Boolean(token),
    queryFn: () => inboxApi.unreadNotificationCount(requireToken(token)),
  })
}

export function useMarkNotificationReadMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: number) =>
      inboxApi.markNotificationRead(requireToken(token), notificationId),
    onSuccess: (updated) => {
      queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.list, (prev) =>
        prev
          ? prev.map((item) => (item.id === updated.id ? updated : item))
          : prev,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount })
    },
  })
}

export function useMarkAllNotificationsReadMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => inboxApi.markAllNotificationsRead(requireToken(token)),
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.list, (prev) =>
        prev
          ? prev.map((item) =>
              item.read_at ? item : { ...item, read_at: new Date().toISOString() },
            )
          : prev,
      )
      queryClient.setQueryData(queryKeys.notifications.unreadCount, { count: 0 })
    },
  })
}
