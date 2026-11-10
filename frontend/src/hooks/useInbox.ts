import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as inboxApi from '../api/inbox'
import { queryKeys } from '../lib/queryKeys'
import type { ChatMessage, Conversation } from '../types'
import { requireToken, useAuthToken } from './useAuthToken'

export function useInboxDirectoryQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.inbox.directory,
    enabled: Boolean(token),
    queryFn: () => inboxApi.listDirectory(requireToken(token)),
  })
}

export function useConversationsQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.inbox.conversations,
    enabled: Boolean(token),
    queryFn: () => inboxApi.listConversations(requireToken(token)),
  })
}

export function useMessagesQuery(conversationId: number | null) {
  const token = useAuthToken()
  return useQuery({
    queryKey:
      conversationId != null
        ? queryKeys.inbox.messages(conversationId)
        : ['inbox', 'conversations', 'none', 'messages'],
    enabled: Boolean(token) && conversationId != null,
    queryFn: () => inboxApi.listMessages(requireToken(token), conversationId as number),
  })
}

export function useOpenConversationMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) =>
      inboxApi.openConversation(requireToken(token), userId),
    onSuccess: (conversation) => {
      queryClient.setQueryData<Conversation[]>(queryKeys.inbox.conversations, (prev) => {
        if (!prev) return [conversation]
        // One chat per other user — replace any older duplicate rows
        const withoutPeer = prev.filter(
          (item) =>
            item.id !== conversation.id &&
            item.other_user.id !== conversation.other_user.id,
        )
        return [conversation, ...withoutPeer]
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.conversations })
    },
  })
}

export function useSendMessageMutation(conversationId: number | null) {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => {
      if (conversationId == null) throw new Error('No conversation selected')
      return inboxApi.sendMessage(requireToken(token), conversationId, body)
    },
    onSuccess: (message: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.inbox.messages(message.conversation_id),
        (prev) => {
          if (!prev) return [message]
          if (prev.some((item) => item.id === message.id)) return prev
          return [...prev, message]
        },
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.conversations })
    },
  })
}
