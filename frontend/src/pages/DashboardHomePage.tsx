import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FiArrowUpRight, FiCalendar, FiCheckCircle } from 'react-icons/fi'
import { Alert } from '../components/ui'
import { useCompanyQuery, useWorkDashboardQuery } from '../hooks'
import { useAuthStore } from '../stores/authStore'
import { cn } from '../lib/cn'

const TEAL = '#14b8a6'
const INDIGO = '#6366f1'
const CORAL = '#f43f5e'
const TRACK = '#eef2f6'

function SoftCard({
  children,
  className,
  title,
  href,
}: {
  children: ReactNode
  className?: string
  title: string
  href?: string
}) {
  return (
    <section
      className={cn(
        'relative flex min-h-0 flex-col rounded-[20px] border border-[#e8edf3] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.04)] sm:p-[1.15rem]',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-[0.95rem] font-bold tracking-tight text-ink">{title}</h2>
        {href ? (
          <Link
            to={href}
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-[#f3f6fa] hover:text-ink"
            aria-label={`Open ${title}`}
          >
            <FiArrowUpRight size={15} />
          </Link>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function SoftTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[#e8edf3] bg-white px-3 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.1)]">
      {label ? <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{label}</p> : null}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted">{entry.name}</span>
          <span className="ml-auto font-display font-bold text-ink">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function ThickTrack({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-muted">{label}</span>
        <span className="font-display text-sm font-bold text-ink">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full" style={{ background: TRACK }}>
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function CompletionGauge({
  percent,
  done,
  open,
}: {
  percent: number
  done: number
  open: number
}) {
  const clamped = Math.min(Math.max(percent, 0), 100)
  const radius = 86
  const stroke = 16
  const circumference = Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const risk =
    clamped >= 70 ? 'On track' : clamped >= 40 ? 'Steady' : 'Needs push'

  return (
    <div className="flex h-full flex-col">
      <div className="relative mx-auto w-full max-w-[260px]">
        <svg viewBox="0 0 220 128" className="h-auto w-full overflow-visible">
          <path
            d="M 24 114 A 86 86 0 0 1 196 114"
            fill="none"
            stroke={TRACK}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d="M 24 114 A 86 86 0 0 1 196 114"
            fill="none"
            stroke={INDIGO}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <p className="font-display text-4xl font-bold tracking-tight text-ink">{clamped}%</p>
          <p className="mt-0.5 text-sm font-medium text-muted">{risk}</p>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
        <div className="rounded-2xl bg-[#f7f9fc] px-3 py-2.5 text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">Done</p>
          <p className="mt-0.5 font-display text-xl font-bold text-ink">{done}</p>
        </div>
        <div className="rounded-2xl bg-[#f7f9fc] px-3 py-2.5 text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">Open</p>
          <p className="mt-0.5 font-display text-xl font-bold text-ink">{open}</p>
        </div>
      </div>
    </div>
  )
}

function EmptyPanel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="grid min-h-[110px] place-items-center rounded-2xl bg-[#f7f9fc] px-4 text-center">
      <div>
        <div className="mx-auto mb-2 grid size-10 place-items-center rounded-xl bg-white text-[#c0c8d4] shadow-sm">
          {icon}
        </div>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}

export function DashboardHomePage() {
  const user = useAuthStore((s) => s.user)
  const companyQuery = useCompanyQuery()
  const dashboardQuery = useWorkDashboardQuery()

  const companyName =
    companyQuery.data?.name || user?.company?.name || 'Your company'
  const data = dashboardQuery.data
  const kpis = data?.kpis

  const statusMap = useMemo(() => {
    const map = { Todo: 0, 'In Progress': 0, Done: 0 }
    for (const item of data?.tasks_by_status ?? []) {
      if (item.name in map) map[item.name as keyof typeof map] = item.value
    }
    return map
  }, [data?.tasks_by_status])

  const spaceRows = useMemo(
    () =>
      (data?.tasks_by_space ?? []).slice(0, 8).map((item, index) => ({
        name: item.name,
        value: item.value,
        fill: index % 2 === 0 ? TEAL : INDIGO,
      })),
    [data?.tasks_by_space],
  )

  const teamSeries = useMemo(
    () =>
      (data?.team_performance ?? []).slice(0, 6).map((item) => ({
        name: item.name.length > 9 ? `${item.name.slice(0, 8)}…` : item.name,
        fullName: item.name,
        Assigned: item.assigned_tasks,
        Done: item.done_tasks,
      })),
    [data?.team_performance],
  )

  const memberRows = useMemo(
    () => (data?.member_performance ?? []).filter((m) => m.open > 0 || m.assigned > 0).slice(0, 5),
    [data?.member_performance],
  )

  const assignedOpen = useMemo(
    () => memberRows.reduce((sum, item) => sum + item.open, 0),
    [memberRows],
  )
  const unassignedOpen = Math.max((data?.kpis?.tasks_open ?? 0) - assignedOpen, 0)

  const priorityRows = data?.tasks_by_priority ?? []
  const projectRows = data?.project_progress ?? []

  if (dashboardQuery.isLoading && !data) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="skeleton h-10 w-72 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-56 rounded-[20px]" />
          ))}
        </div>
      </div>
    )
  }

  if (dashboardQuery.error) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <Alert>{(dashboardQuery.error as Error).message}</Alert>
      </div>
    )
  }

  const tasksTotal = kpis?.tasks_total ?? 0
  const tasksDone = kpis?.tasks_done ?? 0
  const tasksOpen = kpis?.tasks_open ?? 0
  const completion = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0
  const barMax = Math.max(tasksTotal, statusMap.Done, statusMap['In Progress'], statusMap.Todo, 1)
  const spaceMax = Math.max(...spaceRows.map((row) => row.value), 1)

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="fade-up mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">
            Dashboard overview
          </h1>
          <span className="inline-flex items-center rounded-full border border-[#e8edf3] bg-white px-3 py-1.5 text-sm font-medium text-muted shadow-sm">
            {companyName}
          </span>
        </div>
        <Link
          to="/app/spaces"
          className="inline-flex items-center gap-2 rounded-full bg-[#e8f1ff] px-4 py-2 text-sm font-semibold text-accent transition hover:bg-[#dbe7ff]"
        >
          Open spaces
        </Link>
      </header>

      <div className="fade-up-delay grid gap-3 lg:grid-cols-3">
        <SoftCard title="Projects analytics" href="/app/projects">
          <p className="mb-3 text-sm text-muted">
            Total tasks:{' '}
            <span className="font-display text-base font-bold text-ink">{tasksTotal}</span>
          </p>
          <div className="space-y-3">
            <ThickTrack label="Completed" value={statusMap.Done} max={barMax} color={TEAL} />
            <ThickTrack
              label="In progress"
              value={statusMap['In Progress']}
              max={barMax}
              color={INDIGO}
            />
            <ThickTrack label="Todo" value={statusMap.Todo} max={barMax} color="#cbd5e1" />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: TEAL }} />
              Completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: INDIGO }} />
              In progress
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-slate-300" />
              Todo
            </span>
          </div>
        </SoftCard>

        <SoftCard title="Priority mix">
          {priorityRows.some((item) => item.value > 0) ? (
            <div className="space-y-3">
              {priorityRows.map((item) => {
                const color =
                  item.name === 'High' ? CORAL : item.name === 'Medium' ? INDIGO : '#94a3b8'
                return (
                  <ThickTrack
                    key={item.name}
                    label={item.name}
                    value={item.value}
                    max={Math.max(...priorityRows.map((row) => row.value), 1)}
                    color={color}
                  />
                )
              })}
            </div>
          ) : (
            <EmptyPanel icon={<FiCheckCircle size={20} />} label="No priority data yet." />
          )}
        </SoftCard>

        <SoftCard title="Company snapshot" href="/app/spaces">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Spaces', value: kpis?.spaces ?? 0 },
              { label: 'Projects', value: kpis?.projects ?? 0 },
              { label: 'Teams', value: kpis?.teams ?? 0 },
              { label: 'Members', value: kpis?.members ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-[#f7f9fc] px-3 py-3">
                <p className="text-xs font-semibold text-muted">{item.label}</p>
                <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 rounded-2xl border border-dashed border-[#e8edf3] bg-[#fbfcfe] px-3 py-2.5 text-sm text-muted">
            Avg project progress{' '}
            <span className="font-display font-bold text-ink">
              {kpis?.avg_project_progress ?? 0}%
            </span>
          </div>
        </SoftCard>

        <SoftCard title="Tasks by space" href="/app/spaces">
          {spaceRows.length > 0 ? (
            <div className="space-y-2.5">
              {spaceRows.map((item) => (
                <div key={item.name} className="rounded-2xl bg-[#f7f9fc] px-3 py-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                    <span className="shrink-0 font-display text-sm font-bold tabular-nums text-ink">
                      {item.value}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${Math.max((item.value / spaceMax) * 100, item.value > 0 ? 8 : 0)}%`,
                        background: item.fill,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel icon={<FiCalendar size={20} />} label="No space activity yet." />
          )}
        </SoftCard>

        <SoftCard title="Task completion rate">
          <CompletionGauge percent={completion} done={tasksDone} open={tasksOpen} />
        </SoftCard>

        <SoftCard title="Open work" href="/app/tasks">
          {memberRows.length > 0 || unassignedOpen > 0 ? (
            <div className="space-y-2">
              {unassignedOpen > 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f7f9fc] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">Unassigned</p>
                    <p className="text-xs tabular-nums text-muted">
                      {unassignedOpen} open · needs an owner
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 font-display text-xs font-bold tabular-nums text-ink shadow-sm">
                    {unassignedOpen}
                  </span>
                </div>
              ) : null}
              {memberRows.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#f7f9fc] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                    <p className="text-xs tabular-nums text-muted">
                      {item.open} open · {item.done} done
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 font-display text-xs font-bold tabular-nums text-ink shadow-sm">
                    {item.assigned}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel icon={<FiCheckCircle size={20} />} label="No open work items." />
          )}
        </SoftCard>

        {teamSeries.length > 0 ? (
          <SoftCard title="Team load" className="lg:col-span-2">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={teamSeries} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#eef2f6" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip
                    content={<SoftTooltip />}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName || ''
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="Done"
                    stroke={CORAL}
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: CORAL, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Assigned"
                    stroke="#0f172a"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#0f172a', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs font-semibold text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: CORAL }} />
                Done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-ink" />
                Assigned
              </span>
            </div>
          </SoftCard>
        ) : null}

        <SoftCard
          title="Project progress"
          href="/app/projects"
          className={teamSeries.length > 0 ? undefined : 'lg:col-span-3'}
        >
          {projectRows.length > 0 ? (
            <div className="space-y-2.5">
              {projectRows.slice(0, 5).map((item) => (
                <div key={`${item.space_name}-${item.name}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                      <p className="truncate text-[0.7rem] text-muted">{item.space_name}</p>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-ink">{item.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: TRACK }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(Math.max(item.progress, 0), 100)}%`,
                        background: item.progress >= 70 ? TEAL : INDIGO,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel icon={<FiCalendar size={20} />} label="No projects in this preview." />
          )}
        </SoftCard>
      </div>
    </div>
  )
}
