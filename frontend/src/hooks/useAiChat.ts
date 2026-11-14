import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as aiApi from '../api/ai'
import { queryKeys } from '../lib/queryKeys'
import { requireToken, useAuthToken } from './useAuthToken'

export function useAiConversationsQuery(enabled = true) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.ai.conversations,
    enabled: Boolean(token) && enabled,
    queryFn: () => aiApi.listAiConversations(requireToken(token)),
  })
}

export function useAiConversationQuery(conversationId: number | null) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.ai.conversation(conversationId ?? 0),
    enabled: Boolean(token) && conversationId != null,
    queryFn: () => aiApi.getAiConversation(conversationId!, requireToken(token)),
  })
}

export function useCreateAiConversationMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => aiApi.createAiConversation(requireToken(token)),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.ai.conversation(created.id), created)
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.conversations })
    },
  })
}

export function useDeleteAiConversationMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: number) =>
      aiApi.deleteAiConversation(conversationId, requireToken(token)),
    onSuccess: (_data, conversationId) => {
      queryClient.removeQueries({ queryKey: queryKeys.ai.conversation(conversationId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.conversations })
    },
  })
}

export function useAiChatMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      message,
      conversationId,
    }: {
      message: string
      conversationId?: number | null
    }) => aiApi.aiChat(message, requireToken(token), conversationId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.conversations })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ai.conversation(result.conversation_id),
      })
    },
  })
}
