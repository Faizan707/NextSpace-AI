import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { FiCpu, FiSend } from 'react-icons/fi'
import { aiChat, type AiChatHistoryItem } from '../api/ai'
import { Alert, Button } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import { cn } from '../lib/cn'

type UiMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools?: Array<{ name: string }>
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function AiAssistantPage() {
  const token = useAuthStore((s) => s.token)
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'I can check your tasks and projects, create or update spaces, create and assign tasks, and read or reply to task comments. What do you need?',
    },
  ])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || !token || loading) return

    const userMsg: UiMessage = { id: uid(), role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setDraft('')
    setLoading(true)
    setError(null)

    const history: AiChatHistoryItem[] = nextMessages
      .filter((m) => m.id !== 'welcome')
      .slice(0, -1)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const result = await aiChat(text, history, token)
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: result.reply,
          tools: (result.tool_calls || []).map((t) => ({ name: t.name })),
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setLoading(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void onSubmit()
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-6.75rem)] max-w-[900px] flex-col gap-3">
      <header className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent">
          <FiCpu size={18} aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">AI Assistant</h1>
          <p className="text-sm text-muted">Ask about work or take action in your workspace.</p>
        </div>
      </header>

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-line/80 bg-surface shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'bg-accent text-white'
                    : 'bg-[#f3f6fa] text-ink',
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.tools && message.tools.length > 0 ? (
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide opacity-70">
                    Used: {message.tools.map((t) => t.name).join(', ')}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-[22px] bg-[#f3f6fa] px-4 py-3 text-sm text-muted">
                Thinking…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-line p-4">
          <div className="flex items-end gap-3 rounded-[22px] bg-[#f3f6fa] p-2 pl-4">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="e.g. How many tasks are assigned to me?"
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-placeholder"
            />
            <Button type="submit" disabled={loading || !draft.trim()} className="shrink-0 rounded-full px-4">
              <FiSend size={16} aria-hidden />
              <span className="sr-only">Send</span>
            </Button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">
            Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  )
}
