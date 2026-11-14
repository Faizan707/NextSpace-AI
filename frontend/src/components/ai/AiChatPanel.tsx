import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { FiCopy, FiRefreshCw, FiSend } from 'react-icons/fi'
import { useAiChatMutation, useAiConversationQuery, useCompanyMembersQuery } from '../../hooks'
import { toast } from '../../stores/toastStore'
import { Alert, Avatar, Button } from '../ui'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../lib/cn'
import type { CompanyMember } from '../../types'

type UiMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  failed?: boolean
  error?: string
}

const WELCOME: UiMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'I can check your tasks and projects, create or update spaces, create and assign tasks, and read or reply to task comments. What do you need?',
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function memberLabel(member: CompanyMember) {
  return member.full_name?.trim() || member.email
}

type AiChatPanelProps = {
  className?: string
  compact?: boolean
  autoFocus?: boolean
  conversationId: number | null
  onConversationChange: (conversationId: number) => void
}

export function AiChatPanel({
  className,
  compact = false,
  autoFocus = false,
  conversationId,
  onConversationChange,
}: AiChatPanelProps) {
  const token = useAuthStore((s) => s.token)
  const membersQuery = useCompanyMembersQuery(Boolean(token))
  const members = membersQuery.data ?? []
  const conversationQuery = useAiConversationQuery(conversationId)
  const chatMutation = useAiChatMutation()

  const [messages, setMessages] = useState<UiMessage[]>([WELCOME])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const loading = chatMutation.isPending

  const filteredMembers = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase()
    return members
      .filter((member) => {
        const name = (member.full_name || '').toLowerCase()
        const email = member.email.toLowerCase()
        return !q || name.includes(q) || email.includes(q)
      })
      .slice(0, 8)
  }, [members, mentionQuery])

  useEffect(() => {
    if (conversationId == null) {
      setMessages([WELCOME])
      setError(null)
      return
    }
    const data = conversationQuery.data
    if (!data || data.id !== conversationId) return
    if (data.messages.length === 0) {
      setMessages([WELCOME])
      return
    }
    setMessages(
      data.messages.map((m) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
      })),
    )
  }, [conversationId, conversationQuery.data])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!autoFocus) return
    const id = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(id)
  }, [autoFocus, conversationId])

  useEffect(() => {
    setMentionIndex(0)
  }, [mentionQuery, mentionOpen])

  function detectMention(value: string, caret: number) {
    const before = value.slice(0, caret)
    const match = before.match(/@([^\s@]*)$/)
    if (!match) {
      setMentionOpen(false)
      setMentionQuery('')
      return
    }
    setMentionOpen(true)
    setMentionQuery(match[1] || '')
  }

  function insertMention(member: CompanyMember) {
    const el = inputRef.current
    const caret = el?.selectionStart ?? draft.length
    const before = draft.slice(0, caret)
    const after = draft.slice(caret)
    const match = before.match(/@([^\s@]*)$/)
    const token = `@${memberLabel(member)} <${member.email}> `
    const replaced = match
      ? `${before.slice(0, before.length - match[0].length)}${token}`
      : `${before}${token}`
    setDraft(replaced + after)
    setMentionOpen(false)
    setMentionQuery('')
    requestAnimationFrame(() => {
      if (!el) return
      const pos = replaced.length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  async function copyMessage(message: UiMessage) {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedId(message.id)
      toast.success('Copied')
      window.setTimeout(() => setCopiedId((id) => (id === message.id ? null : id)), 1500)
    } catch {
      toast.error('Could not copy')
    }
  }

  async function sendUserMessage(text: string, existingUserMsgId?: string) {
    if (!text || !token || loading) return

    let userMsgId = existingUserMsgId
    if (existingUserMsgId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === existingUserMsgId ? { ...m, failed: false, error: undefined } : m,
        ),
      )
    } else {
      const userMsg: UiMessage = { id: uid(), role: 'user', content: text }
      userMsgId = userMsg.id
      setMessages((prev) => [...prev, userMsg])
      setDraft('')
      setMentionOpen(false)
    }

    setError(null)

    try {
      const result = await chatMutation.mutateAsync({
        message: text,
        conversationId,
      })
      onConversationChange(result.conversation_id)
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== userMsgId)
        return [
          ...withoutTemp,
          {
            id: String(result.user_message.id),
            role: 'user' as const,
            content: result.user_message.content,
          },
          {
            id: String(result.assistant_message.id),
            role: 'assistant' as const,
            content: result.assistant_message.content,
          },
        ]
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed'
      setError(message)
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsgId ? { ...m, failed: true, error: message } : m)),
      )
    } finally {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault()
    await sendUserMessage(draft.trim())
  }

  async function resendMessage(message: UiMessage) {
    if (message.role !== 'user' || loading) return
    await sendUserMessage(message.content, message.id)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen && filteredMembers.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setMentionIndex((i) => (i + 1) % filteredMembers.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setMentionIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length)
        return
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        insertMention(filteredMembers[mentionIndex] ?? filteredMembers[0])
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setMentionOpen(false)
        return
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        insertMention(filteredMembers[mentionIndex] ?? filteredMembers[0])
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void onSubmit()
    }
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {error ? (
        <div className={cn(compact ? 'px-4 pt-3' : 'mb-3')}>
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          !compact &&
            'rounded-[28px] border border-line/80 bg-surface shadow-[0_8px_30px_rgba(15,23,42,0.05)]',
        )}
      >
        <div
          className={cn(
            'min-h-0 flex-1 space-y-4 overflow-y-auto',
            compact ? 'px-4 py-4' : 'px-4 py-5 sm:px-6',
          )}
        >
          {messages.map((message) => {
            const isUser = message.role === 'user'
            return (
              <div
                key={message.id}
                className={cn('group flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-relaxed',
                    isUser
                      ? message.failed
                        ? 'bg-danger text-white'
                        : 'bg-accent text-white'
                      : 'bg-[#f3f6fa] text-ink',
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.failed && message.error ? (
                    <p className="mt-2 text-[11px] font-medium opacity-90">
                      Failed: {message.error}
                    </p>
                  ) : null}
                </div>

                {message.id !== 'welcome' ? (
                  <div
                    className={cn(
                      'flex flex-wrap items-center gap-1',
                      message.failed
                        ? 'opacity-100'
                        : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100',
                      'transition-opacity',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void copyMessage(message)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted hover:bg-surface-2 hover:text-ink"
                      aria-label="Copy message"
                    >
                      <FiCopy size={12} aria-hidden />
                      {copiedId === message.id ? 'Copied' : 'Copy'}
                    </button>
                    {message.failed && isUser ? (
                      <button
                        type="button"
                        onClick={() => void resendMessage(message)}
                        disabled={loading}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-ink-on-accent hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Resend message"
                      >
                        <FiRefreshCw size={12} aria-hidden />
                        Resend
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-[22px] bg-[#f3f6fa] px-4 py-3 text-sm text-muted">
                Thinking…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className={cn('relative border-t border-line', compact ? 'p-3' : 'p-4')}
        >
          {mentionOpen && filteredMembers.length > 0 ? (
            <div
              className="absolute bottom-full left-3 right-3 z-20 mb-2 max-h-48 overflow-y-auto rounded-2xl border border-line bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
              role="listbox"
              aria-label="Mention people"
            >
              {filteredMembers.map((member, index) => (
                <button
                  key={member.id}
                  type="button"
                  role="option"
                  aria-selected={index === mentionIndex}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    insertMention(member)
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm',
                    index === mentionIndex ? 'bg-accent-soft' : 'hover:bg-surface-2',
                  )}
                >
                  <Avatar
                    name={member.full_name}
                    email={member.email}
                    src={member.avatar_url}
                    className="size-7 text-[0.65rem] ring-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">
                      {memberLabel(member)}
                    </span>
                    <span className="block truncate text-xs text-muted">{member.email}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-3 rounded-[22px] bg-[#f3f6fa] p-2 pl-4">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => {
                const value = event.target.value
                setDraft(value)
                detectMention(value, event.target.selectionStart)
              }}
              onKeyDown={onKeyDown}
              onClick={(event) =>
                detectMention(event.currentTarget.value, event.currentTarget.selectionStart)
              }
              rows={1}
              placeholder="e.g. Create a task and assign @…"
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-placeholder"
            />
            <Button
              type="submit"
              disabled={loading || !draft.trim()}
              className="shrink-0 rounded-full px-4"
            >
              <FiSend size={16} aria-hidden />
              <span className="sr-only">Send</span>
            </Button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">
            {compact
              ? 'Type @ to find people · Enter to send'
              : 'Type @ to assign someone · Enter to send · Shift+Enter for new line'}
          </p>
        </form>
      </div>
    </div>
  )
}
