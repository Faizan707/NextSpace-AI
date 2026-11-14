import { apiRequest } from './client'

export type AiChatHistoryItem = {
  role: 'user' | 'assistant'
  content: string
}

export type AiChatResponse = {
  reply: string
  provider: string
  tool_calls: Array<{
    name: string
    arguments?: unknown
    result?: unknown
  }>
}

export function aiChat(
  message: string,
  history: AiChatHistoryItem[],
  token: string,
): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/ai/chat', {
    method: 'POST',
    token,
    body: { message, history },
  })
}
