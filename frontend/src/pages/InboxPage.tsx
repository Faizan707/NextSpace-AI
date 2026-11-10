import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiEdit3, FiSearch, FiSend, FiX } from 'react-icons/fi'
import { Avatar } from '../components/Avatar'
import { Alert, Button } from '../components/ui'
import {
  useConversationsQuery,
  useInboxDirectoryQuery,
  useMessagesQuery,
  useOpenConversationMutation,
  useSendMessageMutation,
} from '../hooks'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import type { ChatMessage } from '../types'
import { cn } from '../lib/cn'

function personLabel(name?: string | null, email?: string | null) {
  return name?.trim() || email || 'User'
}

function formatListTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  if (isYesterday) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatBubbleTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDayLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  if (isYesterday) return 'Yesterday'
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function dayKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

type MessageRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; message: ChatMessage; stacked: boolean }

function buildMessageRows(messages: ChatMessage[]): MessageRow[] {
  const rows: MessageRow[] = []
  let lastDay = ''
  let lastSender: number | null = null
  let lastTime = 0

  for (const message of messages) {
    const key = dayKey(message.created_at)
    if (key !== lastDay) {
      rows.push({ kind: 'day', key, label: formatDayLabel(message.created_at) })
      lastDay = key
      lastSender = null
      lastTime = 0
    }

    const created = new Date(message.created_at).getTime()
    const stacked =
      lastSender === message.sender_id && created - lastTime < 5 * 60 * 1000

    rows.push({ kind: 'message', message, stacked })
    lastSender = message.sender_id
    lastTime = created
  }

  return rows
}

function EmptyChatArt() {
  return (
    <div className="relative mx-auto size-[88px]" aria-hidden>
      <span className="absolute left-1 top-3 size-14 rounded-full bg-gradient-to-br from-accent-bright to-accent-deep opacity-90 shadow-[0_12px_28px_rgba(37,99,235,0.28)]" />
      <span className="absolute bottom-1 right-0 size-[52px] rounded-full bg-gradient-to-br from-teal to-accent opacity-95 shadow-[0_10px_24px_rgba(124,108,240,0.28)]" />
      <span className="absolute left-5 top-8 size-2.5 rounded-full bg-white/90" />
      <span className="absolute left-9 top-8 size-2.5 rounded-full bg-white/90" />
      <span className="absolute left-7 top-[2.65rem] size-2.5 rounded-full bg-white/90" />
      <span className="absolute bottom-5 right-4 size-2 rounded-full bg-white/85" />
      <span className="absolute bottom-5 right-7 size-2 rounded-full bg-white/85" />
    </div>
  )
}

type SidebarTab = 'all' | 'new'

export function InboxPage() {
  const currentUser = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const conversationParam = searchParams.get('c')
  const initialId = conversationParam ? Number(conversationParam) : null

  const [activeId, setActiveId] = useState<number | null>(
    Number.isFinite(initialId) ? initialId : null,
  )
  const [draft, setDraft] = useState('')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [chatFilter, setChatFilter] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const conversationsQuery = useConversationsQuery()
  const directoryQueryResult = useInboxDirectoryQuery()
  const messagesQuery = useMessagesQuery(activeId)
  const openConversation = useOpenConversationMutation()
  const sendMessage = useSendMessageMutation(activeId)

  const conversations = conversationsQuery.data ?? []
  const directory = directoryQueryResult.data ?? []
  const messages = messagesQuery.data ?? []
  const messageRows = useMemo(() => buildMessageRows(messages), [messages])
  const pickingUser = sidebarTab === 'new'

  useEffect(() => {
    if (conversationParam) {
      const id = Number(conversationParam)
      if (Number.isFinite(id)) setActiveId(id)
    }
  }, [conversationParam])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' })
  }, [activeId, messages.length, messagesQuery.isFetching])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen, sidebarTab])

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [conversations, activeId],
  )

  const filteredDirectory = useMemo(() => {
    const q = directoryQuery.trim().toLowerCase()
    return directory.filter((member) => {
      const label = `${member.full_name || ''} ${member.email}`.toLowerCase()
      return !q || label.includes(q)
    })
  }, [directory, directoryQuery])

  const filteredConversations = useMemo(() => {
    const q = chatFilter.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((conversation) => {
      const label =
        `${conversation.other_user.full_name || ''} ${conversation.other_user.email}`.toLowerCase()
      const preview = conversation.last_message?.body?.toLowerCase() || ''
      return label.includes(q) || preview.includes(q)
    })
  }, [conversations, chatFilter])

  function selectConversation(id: number) {
    setActiveId(id)
    setSidebarTab('all')
    setDraft('')
    setSearchParams(id ? { c: String(id) } : {})
    requestAnimationFrame(() => composerRef.current?.focus())
  }

  function clearConversation() {
    setActiveId(null)
    setSearchParams({})
  }

  async function startChat(userId: number) {
    const existing = conversations.find((item) => item.other_user.id === userId)
    if (existing) {
      selectConversation(existing.id)
      return
    }
    if (openConversation.isPending) return
    try {
      const conversation = await openConversation.mutateAsync(userId)
      selectConversation(conversation.id)
    } catch (err) {
      toast.error('Could not open chat', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleSend(event?: FormEvent) {
    event?.preventDefault()
    const body = draft.trim()
    if (!body || activeId == null) return
    try {
      await sendMessage.mutateAsync(body)
      setDraft('')
      composerRef.current?.focus()
    } catch (err) {
      toast.error('Failed to send', err instanceof Error ? err.message : undefined)
    }
  }

  const showThreadMobile = activeConversation != null
  const searchValue = pickingUser ? directoryQuery : chatFilter

  return (
    <div className="mx-auto flex h-[calc(100dvh-6.75rem)] max-w-[1400px] flex-col gap-3">
      {conversationsQuery.error ? (
        <Alert>{(conversationsQuery.error as Error).message}</Alert>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <aside
          className={cn(
            'flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-line/80 bg-surface shadow-[0_8px_30px_rgba(15,23,42,0.05)]',
            showThreadMobile ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="px-5 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-display text-[1.35rem] font-bold tracking-tight text-ink">
                Messages
              </h1>
              <button
                type="button"
                onClick={() => setSearchOpen((open) => !open)}
                className={cn(
                  'grid size-9 place-items-center rounded-full text-muted transition hover:bg-bg-elevated hover:text-ink',
                  searchOpen && 'bg-accent-soft text-accent',
                )}
                aria-label={searchOpen ? 'Close search' : 'Search'}
                aria-pressed={searchOpen}
              >
                {searchOpen ? <FiX size={16} aria-hidden /> : <FiSearch size={16} aria-hidden />}
              </button>
            </div>

            {searchOpen ? (
              <label className="mt-3 block">
                <span className="sr-only">Search</span>
                <input
                  ref={searchRef}
                  value={searchValue}
                  onChange={(event) =>
                    pickingUser
                      ? setDirectoryQuery(event.target.value)
                      : setChatFilter(event.target.value)
                  }
                  placeholder={pickingUser ? 'Search people…' : 'Search messages…'}
                  className="w-full rounded-full border-0 bg-bg-elevated px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-transparent transition placeholder:text-placeholder focus:bg-surface focus:ring-accent/30"
                />
              </label>
            ) : null}

            <div className="mt-4 flex gap-5 overflow-x-auto border-b border-line pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(
                [
                  { id: 'all' as const, label: 'All messages' },
                  { id: 'new' as const, label: 'New chat' },
                ] as const
              ).map((tab) => {
                const active = sidebarTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSidebarTab(tab.id)
                      if (tab.id === 'new') setDirectoryQuery('')
                    }}
                    className={cn(
                      'relative shrink-0 pb-3 text-sm font-semibold transition',
                      active ? 'text-accent' : 'text-muted hover:text-ink',
                    )}
                  >
                    {tab.label}
                    {active ? (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={() => {
                setSidebarTab('new')
                setSearchOpen(true)
                setDirectoryQuery('')
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-deep px-4 py-3.5 text-sm font-semibold text-ink-on-accent shadow-[0_12px_28px_rgba(37,99,235,0.28)] transition hover:brightness-105"
            >
              <FiEdit3 size={15} aria-hidden />
              Start a new conversation
            </button>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 [scrollbar-gutter:stable]">
            {pickingUser ? (
              directoryQueryResult.isLoading ? (
                <p className="px-3 py-6 text-sm text-muted">Loading people…</p>
              ) : filteredDirectory.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted">No people found.</p>
              ) : (
                filteredDirectory.map((member, index) => (
                  <button
                    key={member.id}
                    type="button"
                    disabled={openConversation.isPending}
                    onClick={() => void startChat(member.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 px-3 py-3.5 text-left transition hover:bg-bg-elevated/80 disabled:cursor-wait disabled:opacity-60',
                      index > 0 && 'border-t border-line/80',
                    )}
                  >
                    <Avatar
                      name={member.full_name}
                      email={member.email}
                      imageUrl={member.avatar_url}
                      className="size-11 shrink-0 text-sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {personLabel(member.full_name, member.email)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {member.email}
                      </span>
                    </span>
                  </button>
                ))
              )
            ) : conversationsQuery.isLoading ? (
              <div className="space-y-1 px-1 py-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3.5',
                      index > 0 && 'border-t border-line/80',
                    )}
                  >
                    <div className="skeleton size-11 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="skeleton h-3 w-1/2 rounded-full" />
                      <div className="skeleton h-2.5 w-full rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-semibold text-ink">
                  {chatFilter.trim() ? 'No matching chats' : 'No messages yet'}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {chatFilter.trim()
                    ? 'Try another name or message.'
                    : 'Start a conversation with someone in your company.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation, index) => {
                const active = conversation.id === activeId
                const stamp =
                  conversation.last_message?.created_at || conversation.created_at
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-start gap-3 px-3 py-3.5 text-left transition',
                      index > 0 && 'border-t border-line/80',
                      active ? 'bg-accent-soft/70' : 'hover:bg-bg-elevated/70',
                    )}
                  >
                    <Avatar
                      name={conversation.other_user.full_name}
                      email={conversation.other_user.email}
                      imageUrl={conversation.other_user.avatar_url}
                      className="size-11 shrink-0 text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                          {personLabel(
                            conversation.other_user.full_name,
                            conversation.other_user.email,
                          )}
                        </p>
                        <span className="shrink-0 pt-0.5 text-[0.68rem] text-muted">
                          {formatListTime(stamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                        {conversation.last_message?.body || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section
          className={cn(
            'relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[32px] border border-line/80 bg-surface shadow-[0_8px_30px_rgba(15,23,42,0.05)]',
            showThreadMobile ? 'flex' : 'hidden md:flex',
          )}
        >
          {activeConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-4 md:px-6">
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-bg-elevated hover:text-ink md:hidden"
                  onClick={clearConversation}
                  aria-label="Back to chats"
                >
                  <FiArrowLeft size={16} aria-hidden />
                </button>
                <Avatar
                  name={activeConversation.other_user.full_name}
                  email={activeConversation.other_user.email}
                  imageUrl={activeConversation.other_user.avatar_url}
                  className="size-11 text-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.95rem] font-semibold text-ink">
                    {personLabel(
                      activeConversation.other_user.full_name,
                      activeConversation.other_user.email,
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {activeConversation.other_user.job_role ||
                      activeConversation.other_user.email}
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#fafbfd] px-4 py-5 md:px-8 [scrollbar-gutter:stable]">
                {messagesQuery.isLoading ? (
                  <div className="space-y-3 py-4">
                    <div className="skeleton ml-0 h-12 w-2/3 max-w-sm rounded-[22px] rounded-bl-md" />
                    <div className="skeleton ml-auto h-10 w-1/2 max-w-xs rounded-[22px] rounded-br-md" />
                    <div className="skeleton ml-0 h-16 w-3/4 max-w-md rounded-[22px] rounded-bl-md" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="grid h-full min-h-[220px] place-items-center text-center">
                    <div>
                      <Avatar
                        name={activeConversation.other_user.full_name}
                        email={activeConversation.other_user.email}
                        imageUrl={activeConversation.other_user.avatar_url}
                        className="mx-auto size-14 text-base"
                      />
                      <p className="mt-4 text-sm font-semibold text-ink">
                        Start the conversation
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Say hello to{' '}
                        {personLabel(
                          activeConversation.other_user.full_name,
                          activeConversation.other_user.email,
                        )}
                        .
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-3xl flex-col gap-1">
                    {messageRows.map((row) => {
                      if (row.kind === 'day') {
                        return (
                          <div
                            key={`day-${row.key}`}
                            className="my-3 flex items-center justify-center"
                          >
                            <span className="rounded-full bg-surface px-3 py-1 text-[0.68rem] font-semibold text-muted shadow-sm ring-1 ring-line/80">
                              {row.label}
                            </span>
                          </div>
                        )
                      }

                      const { message, stacked } = row
                      const mine = message.sender_id === currentUser?.id
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex',
                            mine ? 'justify-end' : 'justify-start',
                            stacked ? 'mt-0.5' : 'mt-2.5',
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[min(85%,34rem)] px-3.5 py-2.5 text-sm leading-relaxed',
                              mine
                                ? 'rounded-[22px] rounded-br-md bg-accent text-ink-on-accent shadow-[0_8px_20px_rgba(37,99,235,0.2)]'
                                : 'rounded-[22px] rounded-bl-md bg-surface text-ink shadow-sm ring-1 ring-line/80',
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                            <p
                              className={cn(
                                'mt-1 text-right text-[0.65rem] tabular-nums',
                                mine ? 'text-ink-on-accent/70' : 'text-muted',
                              )}
                            >
                              {formatBubbleTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div
                      ref={bottomRef}
                      className="h-px w-full [scroll-initial-target:nearest]"
                    />
                  </div>
                )}
              </div>

              <form
                className="border-t border-line bg-surface p-4 md:px-6 md:pb-5"
                onSubmit={(event) => void handleSend(event)}
              >
                <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-full border border-line bg-bg-elevated/70 px-2 py-1.5 transition focus-within:border-accent/40 focus-within:bg-surface focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]">
                  <textarea
                    ref={composerRef}
                    value={draft}
                    rows={1}
                    placeholder="Write a message…"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void handleSend()
                      }
                    }}
                    className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-placeholder"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="mb-0.5 size-10 shrink-0 rounded-full"
                    disabled={!draft.trim() || sendMessage.isPending}
                    aria-label="Send message"
                  >
                    <FiSend size={15} aria-hidden />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center px-6 text-center">
              <div className="max-w-sm">
                <EmptyChatArt />
                <p className="mt-6 font-display text-xl font-bold tracking-tight text-ink">
                  No conversation selected
                </p>
                <p className="mt-2 text-sm text-muted">
                  You can view your conversation in the side bar
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
