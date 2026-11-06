import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useCompanyStore } from '../../stores/companyStore'
import { useSpaceStore } from '../../stores/spaceStore'
import { cn } from '../../lib/cn'
import { UserMenu } from './UserMenu'

const navItems = [
  { to: '/app', label: 'Dashboard', end: true, icon: '▦' },
  { to: '/app/spaces', label: 'Spaces', end: false, icon: '◇' },
  { to: '/app/projects', label: 'Projects', end: false, icon: '▣' },
  { to: '/app/tasks', label: 'Tasks', end: false, icon: '✓' },
]

export function AppShell() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const logout = useAuthStore((s) => s.logout)
  const fetchCompany = useCompanyStore((s) => s.fetchCompany)
  const fetchSpaces = useSpaceStore((s) => s.fetchSpaces)
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    if (!token) return
    void fetchMe()
    void fetchCompany()
    void fetchSpaces()
  }, [token, fetchMe, fetchCompany, fetchSpaces])

  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="relative z-1 flex min-h-dvh">
      <aside className="hidden w-[240px] shrink-0 border-r border-line bg-surface md:flex md:flex-col">
        <div className="border-b border-line px-5 py-5">
          <p className="font-display text-lg font-extrabold tracking-tight text-ink">NextSpace</p>
          <p className="mt-1 text-xs text-muted">Workspace</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-xl border border-line md:hidden"
              onClick={() => setMobileNav((v) => !v)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold tracking-tight text-ink md:text-xl">
                Welcome back, {firstName}
              </p>
              <p className="hidden text-xs text-muted sm:block">Your workspace overview</p>
            </div>
          </div>

          <UserMenu user={user} onLogout={handleLogout} />
        </header>

        {mobileNav ? (
          <div className="border-b border-line bg-surface p-3 md:hidden">
            <nav className="grid gap-1">
              {navItems.map((item) => (
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
