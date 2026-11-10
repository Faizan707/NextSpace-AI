import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { realtimeWsUrl } from '../lib/wsUrl'
import { queryKeys } from '../lib/queryKeys'
import type { AppNotification, ChatMessage, Conversation } from '../types'
import { useAuthToken } from './useAuthToken'

type RealtimeEvent =
  | { type: 'realtime.connected' }
  | { type: 'chat.message'; message: ChatMessage }
  | { type: 'notification.created'; notification: AppNotification }

export function useRealtime() {
  const token = useAuthToken()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!token) return

    let closed = false
    let socket: WebSocket | null = null
    let retryMs = 1500
    let retryTimer: number | undefined
    let pingTimer: number | undefined

    function clearTimers() {
      if (retryTimer) window.clearTimeout(retryTimer)
      if (pingTimer) window.clearInterval(pingTimer)
      retryTimer = undefined
      pingTimer = undefined
    }

    function connect() {
      if (closed) return
      socket = new WebSocket(realtimeWsUrl(token as string))

      socket.onopen = () => {
        retryMs = 1500
        pingTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send('ping')
          }
        }, 25000)
      }

      socket.onmessage = (event) => {
        let data: RealtimeEvent
        try {
          data = JSON.parse(String(event.data)) as RealtimeEvent
        } catch {
          return
        }

        if (data.type === 'chat.message') {
          const message = data.message
          queryClient.setQueryData<ChatMessage[]>(
            queryKeys.inbox.messages(message.conversation_id),
            (prev) => {
              if (!prev) return [message]
              if (prev.some((item) => item.id === message.id)) return prev
              return [...prev, message]
            },
          )
          queryClient.setQueryData<Conversation[]>(queryKeys.inbox.conversations, (prev) => {
            if (!prev) {
              void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.conversations })
              return prev
            }
            const next = prev.map((conversation) =>
              conversation.id === message.conversation_id
                ? { ...conversation, last_message: message }
                : conversation,
            )
            next.sort((a, b) => {
              const aTime = a.last_message?.created_at || a.created_at
              const bTime = b.last_message?.created_at || b.created_at
              return bTime.localeCompare(aTime)
            })
            return next
          })
          return
        }

        if (data.type === 'notification.created') {
          const notification = data.notification
          queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.list, (prev) => {
            if (!prev) return [notification]
            if (prev.some((item) => item.id === notification.id)) return prev
            return [notification, ...prev]
          })
          queryClient.setQueryData<{ count: number }>(
            queryKeys.notifications.unreadCount,
            (prev) => ({ count: (prev?.count ?? 0) + 1 }),
          )
        }
      }

      socket.onclose = () => {
        clearTimers()
        if (closed) return
        retryTimer = window.setTimeout(() => {
          retryMs = Math.min(retryMs * 1.5, 15000)
          connect()
        }, retryMs)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      closed = true
      clearTimers()
      socket?.close()
    }
  }, [token, queryClient])
}
