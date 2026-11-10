import { apiRequest } from './client'
import type { AppNotification, ChatMessage, Conversation, SpaceCreator } from '../types'

export function listDirectory(token: string) {
  return apiRequest<SpaceCreator[]>('/inbox/directory', { token })
}

export function listConversations(token: string) {
  return apiRequest<Conversation[]>('/inbox/conversations', { token })
}

export function openConversation(token: string, userId: number) {
  return apiRequest<Conversation>('/inbox/conversations', {
    method: 'POST',
    token,
    body: { user_id: userId },
  })
}

export function listMessages(token: string, conversationId: number) {
  return apiRequest<ChatMessage[]>(`/inbox/conversations/${conversationId}/messages`, { token })
}

export function sendMessage(token: string, conversationId: number, body: string) {
  return apiRequest<ChatMessage>(`/inbox/conversations/${conversationId}/messages`, {
    method: 'POST',
    token,
    body: { body },
  })
}

export function listNotifications(token: string) {
  return apiRequest<AppNotification[]>('/notifications', { token })
}

export function unreadNotificationCount(token: string) {
  return apiRequest<{ count: number }>('/notifications/unread-count', { token })
}

export function markNotificationRead(token: string, notificationId: number) {
  return apiRequest<AppNotification>(`/notifications/${notificationId}/read`, {
    method: 'POST',
    token,
  })
}

export function markAllNotificationsRead(token: string) {
  return apiRequest<{ count: number }>('/notifications/read-all', {
    method: 'POST',
    token,
  })
}
