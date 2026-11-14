import { apiRequest } from './client'

export type AiMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type AiConversationSummary = {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export type AiConversationDetail = AiConversationSummary & {
  messages: AiMessage[]
}

export type AiChatResponse = {
  conversation_id: number
  title: string
  reply: string
  provider: string
  user_message: AiMessage
  assistant_message: AiMessage
  tool_calls: Array<{
    name: string
    arguments?: unknown
    result?: unknown
  }>
}

export function listAiConversations(token: string) {
  return apiRequest<AiConversationSummary[]>('/ai/conversations', { token })
}

export function createAiConversation(token: string) {
  return apiRequest<AiConversationDetail>('/ai/conversations', {
    method: 'POST',
    token,
  })
}

export function getAiConversation(conversationId: number, token: string) {
  return apiRequest<AiConversationDetail>(`/ai/conversations/${conversationId}`, { token })
}

export function deleteAiConversation(conversationId: number, token: string) {
  return apiRequest<void>(`/ai/conversations/${conversationId}`, {
    method: 'DELETE',
    token,
  })
}

export function aiChat(
  message: string,
  token: string,
  conversationId?: number | null,
): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/ai/chat', {
    method: 'POST',
    token,
    body: {
      message,
      conversation_id: conversationId ?? null,
    },
  })
}
