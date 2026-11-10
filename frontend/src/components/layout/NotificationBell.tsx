import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadNotificationCountQuery,
} from '../../hooks'
import { cn } from '../../lib/cn'
import type { AppNotification } from '../../types'

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const listQuery = useNotificationsQuery()
  const countQuery = useUnreadNotificationCountQuery()
  const markRead = useMarkNotificationReadMutation()
  const markAll = useMarkAllNotificationsReadMutation()

  const notifications = listQuery.data ?? []
  const unread = countQuery.data?.count ?? 0

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [open])

  async function handleClick(notification: AppNotification) {
    if (!notification.read_at) {
      try {
        await markRead.mutateAsync(notification.id)
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'relative grid size-10 cursor-pointer place-items-center rounded-full border border-line bg-surface text-muted transition hover:bg-surface-2 hover:text-ink',
          open && 'bg-surface-2 text-ink',
        )}
      >
        <FiBell size={18} aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.65rem] font-bold leading-4 text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                className="cursor-pointer text-xs font-semibold text-accent hover:underline"
                onClick={() => void markAll.mutateAsync()}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {listQuery.isLoading ? (
              <p className="px-4 py-6 text-sm text-muted">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">You’re all caught up.</p>
            ) : (
              notifications.map((notification) => {
                const unreadItem = !notification.read_at
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void handleClick(notification)}
                    className={cn(
                      'flex w-full cursor-pointer flex-col gap-0.5 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-bg-elevated',
                      unreadItem && 'bg-accent-soft/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{notification.title}</p>
                      {unreadItem ? (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" />
                      ) : null}
                    </div>
                    {notification.body ? (
                      <p className="line-clamp-2 text-xs text-muted">{notification.body}</p>
                    ) : null}
                    <p className="text-[0.68rem] text-muted">{formatTime(notification.created_at)}</p>
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
