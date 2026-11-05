import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../../types'

interface UserMenuProps {
  user: User | null
  onLogout: () => void
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const displayName = user?.full_name || user?.email || 'User'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3 pl-1.5 shadow-sm hover:bg-surface-2"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="grid size-8 place-items-center rounded-full bg-teal-soft text-xs font-bold text-teal">
          {initials || 'U'}
        </span>
        <div className="hidden text-left leading-tight sm:block">
          <p className="max-w-[160px] truncate text-sm font-semibold text-ink">{displayName}</p>
          <p className="text-[0.72rem] text-muted">{user?.role?.replace('_', ' ')}</p>
        </div>
        <span className="pr-1 text-muted">▾</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-40 mt-2 w-[220px] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          >
            {user?.role === 'tenant_owner' ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-3 text-left text-sm font-medium text-ink hover:bg-surface-2"
                onClick={() => {
                  setOpen(false)
                  navigate('/app/admin/spaces')
                }}
              >
                Admin
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-3 text-left text-sm font-medium text-ink hover:bg-surface-2"
              onClick={() => {
                setOpen(false)
                navigate('/app/company')
              }}
            >
              Company info
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full border-t border-line px-4 py-3 text-left text-sm font-medium text-danger hover:bg-danger-soft"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
            >
              Sign out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
