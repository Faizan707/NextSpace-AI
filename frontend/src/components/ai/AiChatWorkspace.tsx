import { useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import {
  useAiConversationsQuery,
  useDeleteAiConversationMutation,
} from '../../hooks'
import { toast } from '../../stores/toastStore'
import { cn } from '../../lib/cn'
import { AiChatPanel } from './AiChatPanel'

type AiChatWorkspaceProps = {
  compact?: boolean
  autoFocus?: boolean
  className?: string
}

function formatChatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function AiChatWorkspace({
  compact = false,
  autoFocus = false,
  className,
}: AiChatWorkspaceProps) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const [historyOpen, setHistoryOpen] = useState(!compact)
  const conversationsQuery = useAiConversationsQuery()
  const deleteMutation = useDeleteAiConversationMutation()
  const conversations = conversationsQuery.data ?? []

  function startNewChat() {
    setActiveId(null)
    if (compact) setHistoryOpen(false)
  }

  async function removeChat(conversationId: number) {
    if (!window.confirm('Delete this chat?')) return
    try {
      await deleteMutation.mutateAsync(conversationId)
      if (activeId === conversationId) setActiveId(null)
      toast.success('Chat deleted')
    } catch (err) {
      toast.error('Could not delete chat', err instanceof Error ? err.message : undefined)
    }
  }

  const sidebar = (
    <aside
      className={cn(
        'flex min-h-0 flex-col border-line bg-surface',
        compact ? 'border-b' : 'w-[260px] shrink-0 border-r',
      )}
    >
      <div className="flex items-center gap-2 border-b border-line p-3">
        <button
          type="button"
          onClick={startNewChat}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-ink-on-accent hover:bg-accent-bright"
        >
          <FiPlus size={16} aria-hidden />
          New chat
        </button>
        {compact ? (
          <button
            type="button"
            onClick={() => setHistoryOpen(false)}
            className="cursor-pointer rounded-xl px-2 py-2 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {conversationsQuery.isLoading ? (
          <p className="px-2 py-3 text-sm text-muted">Loading chats…</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted">No chats yet. Start a new one.</p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((chat) => {
              const active = chat.id === activeId
              return (
                <li key={chat.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(chat.id)
                      if (compact) setHistoryOpen(false)
                    }}
                    className={cn(
                      'w-full cursor-pointer rounded-xl px-3 py-2.5 text-left transition',
                      active ? 'bg-accent-soft text-accent' : 'hover:bg-surface-2',
                    )}
                  >
                    <span className="block truncate text-sm font-semibold text-ink">
                      {chat.title || 'New chat'}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {formatChatTime(chat.updated_at)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeChat(chat.id)}
                    className="absolute right-2 top-2 hidden cursor-pointer rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger group-hover:block"
                    aria-label="Delete chat"
                  >
                    <FiTrash2 size={14} aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )

  return (
    <div className={cn('flex min-h-0 flex-1', compact ? 'flex-col' : 'flex-row', className)}>
      {compact ? (
        historyOpen ? (
          <div className="max-h-[40%] min-h-[180px] shrink-0 overflow-hidden">{sidebar}</div>
        ) : (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-ink"
            >
              Chats
            </button>
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft"
            >
              <FiPlus size={14} aria-hidden />
              New
            </button>
          </div>
        )
      ) : (
        sidebar
      )}

      <AiChatPanel
        compact={compact}
        autoFocus={autoFocus}
        conversationId={activeId}
        onConversationChange={setActiveId}
        className="min-h-0 flex-1"
      />
    </div>
  )
}
