import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../lib/cn'
import { UserMenu } from './UserMenu'

const adminNavItems = [
  { to: '/app/admin/spaces', label: 'Space management', end: false, icon: '◇' },
  { to: '/app/admin/users', label: 'Users', end: false, icon: '◎' },
]

export function AdminShell() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const logout = useAuthStore((s) => s.logout)
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    if (!token) return
    void fetchMe()
  }, [token, fetchMe])

  if (user && user.role !== 'tenant_owner') {
    return <Navigate to="/app" replace />
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="relative z-1 flex min-h-dvh">
      <aside className="hidden w-[240px] shrink-0 border-r border-line bg-surface md:flex md:flex-col">
        <div className="border-b border-line px-5 py-5">
          <p className="font-display text-lg font-extrabold tracking-tight text-ink">Admin</p>
          <p className="mt-1 text-xs text-muted">Organization console</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition',
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <NavLink
            to="/app"
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            ← Back to workspace
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="grid size-10 cursor-pointer place-items-center rounded-xl border border-line md:hidden"
              onClick={() => setMobileNav((v) => !v)}
              aria-label="Toggle admin navigation"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold tracking-tight text-ink md:text-xl">
                Admin
              </p>
              <p className="hidden text-xs text-muted sm:block">Manage organization spaces and users</p>
            </div>
          </div>

          <UserMenu user={user} onLogout={handleLogout} />
        </header>

        {mobileNav ? (
          <div className="border-b border-line bg-surface p-3 md:hidden">
            <nav className="grid gap-1">
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileNav(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-xl px-3.5 py-3 text-sm font-semibold',
                      isActive ? 'bg-accent-soft text-accent' : 'text-muted',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <NavLink
                to="/app"
                onClick={() => setMobileNav(false)}
                className="rounded-xl px-3.5 py-3 text-sm font-semibold text-muted"
              >
                ← Back to workspace
              </NavLink>
            </nav>
          </div>
        ) : null}

        <main className="flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
