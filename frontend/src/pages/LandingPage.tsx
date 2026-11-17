import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { buttonClasses } from '../components/ui/Button'
import { useAuthStore } from '../stores/authStore'
import { NextSpaceAiHero } from '../stageshow/NextSpaceAiHero'
import { NextSpaceBento } from '../stageshow/NextSpaceBento'

const TEAL = '#14b8a6'
const INDIGO = '#6366f1'
const CORAL = '#f43f5e'
const TRACK = '#eef2f6'

const TEAM_LOAD = [
  { name: 'Ali', Done: 4, Assigned: 7 },
  { name: 'Sara', Done: 6, Assigned: 9 },
  { name: 'Omar', Done: 3, Assigned: 5 },
  { name: 'Noor', Done: 5, Assigned: 8 },
]

function TrackBar({
  label,
  value,
  max,
  color,
  reduceMotion,
  delay,
}: {
  label: string
  value: number
  max: number
  color: string
  reduceMotion: boolean | null
  delay: number
}) {
  const pct = Math.max((value / max) * 100, 8)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[0.7rem]">
        <span className="font-medium text-muted">{label}</span>
        <span className="font-display text-xs font-bold text-ink">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: TRACK }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

function DashboardPreview({ reduceMotion }: { reduceMotion: boolean | null }) {
  const circumference = Math.PI * 64
  const completion = 72

  return (
    <div className="relative w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -inset-y-8 bg-[radial-gradient(520px_280px_at_70%_20%,rgba(37,99,235,0.14),transparent_60%),radial-gradient(420px_240px_at_20%_80%,rgba(124,108,240,0.12),transparent_55%)]"
      />

      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <p className="m-0 font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
              Dashboard overview
            </p>
            <p className="mt-0.5 m-0 text-sm text-muted">Your company · live rollup</p>
          </div>
          <span className="rounded-full border border-[#e8edf3] bg-white px-3 py-1 text-xs font-semibold text-muted shadow-sm">
            Inside the app
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-[20px] border border-[#e8edf3] bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="m-0 text-sm font-bold text-ink">Projects analytics</p>
            <p className="mt-1 m-0 text-xs text-muted">
              Total tasks <span className="font-display font-bold text-ink">42</span>
            </p>
            <div className="mt-3 space-y-2.5">
              <TrackBar label="Completed" value={24} max={42} color={TEAL} reduceMotion={reduceMotion} delay={0.35} />
              <TrackBar label="In progress" value={11} max={42} color={INDIGO} reduceMotion={reduceMotion} delay={0.45} />
              <TrackBar label="Todo" value={7} max={42} color="#cbd5e1" reduceMotion={reduceMotion} delay={0.55} />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8edf3] bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="m-0 text-sm font-bold text-ink">Company snapshot</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Spaces', value: '6' },
                { label: 'Projects', value: '12' },
                { label: 'Teams', value: '4' },
                { label: 'Members', value: '18' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-[#f7f9fc] px-3 py-2.5">
                  <p className="m-0 text-[0.65rem] font-semibold text-muted">{item.label}</p>
                  <p className="mt-0.5 m-0 font-display text-xl font-bold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8edf3] bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:col-span-2 lg:col-span-1">
            <p className="m-0 text-sm font-bold text-ink">Task completion</p>
            <div className="relative mx-auto mt-1 w-full max-w-[180px]">
              <svg viewBox="0 0 180 110" className="h-auto w-full overflow-visible">
                <path
                  d="M 20 96 A 64 64 0 0 1 160 96"
                  fill="none"
                  stroke={TRACK}
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <motion.path
                  d="M 20 96 A 64 64 0 0 1 160 96"
                  fill="none"
                  stroke={INDIGO}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={reduceMotion ? false : { strokeDashoffset: circumference }}
                  animate={{
                    strokeDashoffset: circumference - (completion / 100) * circumference,
                  }}
                  transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <div className="absolute inset-x-0 bottom-0 text-center">
                <p className="m-0 font-display text-3xl font-bold text-ink">{completion}%</p>
                <p className="m-0 text-xs font-medium text-muted">On track</p>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8edf3] bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:col-span-2 lg:col-span-2">
            <p className="m-0 mb-2 text-sm font-bold text-ink">Team load</p>
            <div className="h-[140px] sm:h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TEAM_LOAD} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    width={28}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Done"
                    stroke={CORAL}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: CORAL, strokeWidth: 0 }}
                    isAnimationActive={!reduceMotion}
                  />
                  <Line
                    type="monotone"
                    dataKey="Assigned"
                    stroke="#0f172a"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#0f172a', strokeWidth: 0 }}
                    isAnimationActive={!reduceMotion}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8edf3] bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="m-0 text-sm font-bold text-ink">Open work</p>
            <div className="mt-3 space-y-2">
              {[
                { name: 'Faizan Butt', open: 5, done: 8 },
                { name: 'Ahsan Azeem', open: 3, done: 6 },
                { name: 'Ali Raza', open: 4, done: 4 },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-[#f7f9fc] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate text-xs font-semibold text-ink">{row.name}</p>
                    <p className="m-0 text-[0.65rem] text-muted">
                      {row.open} open · {row.done} done
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 font-display text-[0.7rem] font-bold text-ink shadow-sm">
                    {row.open + row.done}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const token = useAuthStore((s) => s.token)
  const reduceMotion = useReducedMotion()

  const rise = (delay = 0) =>
    reduceMotion
      ? undefined
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <div className="relative z-1 min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_88%_-8%,rgba(37,99,235,0.14),transparent_55%),radial-gradient(620px_360px_at_-4%_22%,rgba(124,108,240,0.1),transparent_50%),linear-gradient(180deg,#f7f9fc_0%,#eef3f9_42%,#e8eef6_100%)]"
      />

      <header className="relative mx-auto flex w-full max-w-[1140px] items-center justify-between px-8 pt-6 sm:px-10 md:pt-8 lg:px-12">
        <p className="font-display text-[1.2rem] font-extrabold tracking-tight text-ink">NextSpace</p>
        <div className="flex items-center gap-2.5">
          {token ? (
            <Link className={buttonClasses('primary', undefined, 'sm')} to="/app">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className={buttonClasses('ghost', undefined, 'sm')} to="/login">
                Sign in
              </Link>
              <Link className={buttonClasses('primary', undefined, 'sm')} to="/register">
                Start free
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-[1140px] items-center gap-10 px-8 pt-12 pb-10 sm:px-10 md:gap-12 md:pt-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-14 lg:px-12 lg:pt-16">
        <div className="relative min-w-0 max-w-[32rem]">
          <motion.p
            className="m-0 font-display text-[clamp(2.5rem,5vw,3.5rem)] font-extrabold leading-[0.92] tracking-[-0.048em] text-ink"
            {...rise(0.04)}
          >
            NextSpace
          </motion.p>
          <motion.h1
            className="mt-6 m-0 max-w-[16ch] font-display text-[clamp(1.5rem,2.5vw,2rem)] font-bold leading-[1.22] tracking-[-0.03em] text-ink/80"
            {...rise(0.1)}
          >
            The company dashboard your team opens every day
          </motion.h1>
          <motion.p
            className="mt-5 m-0 max-w-[34ch] text-[1.06rem] leading-[1.65] text-muted"
            {...rise(0.16)}
          >
            Spaces, projects, priorities, and who’s carrying the work — plus AI that can assign and
            update the board from chat.
          </motion.p>
          <motion.div className="mt-10 flex flex-wrap items-center gap-3" {...rise(0.22)}>
            <Link className={buttonClasses('primary')} to={token ? '/app' : '/register'}>
              {token ? 'Go to dashboard' : 'Create your workspace'}
            </Link>
            {!token ? (
              <Link className={buttonClasses('secondary')} to="/login">
                I already have an account
              </Link>
            ) : null}
          </motion.div>
        </div>

        <motion.div
          className="relative min-w-0 w-full"
          aria-hidden
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <DashboardPreview reduceMotion={reduceMotion} />
        </motion.div>
      </section>

      <section className="relative mx-auto w-full max-w-[1140px] px-8 pb-16 sm:px-10 md:pb-20 lg:px-12">
        <div className="mb-5 max-w-xl">
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-accent">
            Workspace AI
          </p>
          <h2 className="mt-2 m-0 font-display text-[clamp(1.35rem,2.4vw,1.75rem)] font-bold tracking-tight text-ink">
            Ask once. Watch the board move.
          </h2>
        </div>
        <div className="overflow-hidden rounded-[24px] border border-[#e8edf3] bg-[#e8eef6]/40 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-5 md:p-6">
          <NextSpaceAiHero />
        </div>
      </section>

      <section className="relative border-t border-line/60 bg-[#fbfcfe]">
        <div className="mx-auto w-full max-w-[1140px] px-8 py-16 sm:px-10 md:py-20 lg:px-12 lg:py-24">
          <div className="max-w-2xl">
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-accent">
              Inside NextSpace
            </p>
            <h2 className="mt-3 m-0 font-display text-[clamp(1.85rem,3.2vw,2.55rem)] font-bold leading-[1.12] tracking-[-0.035em] text-ink">
              What the workspace is built for
            </h2>
            <p className="mt-4 m-0 max-w-[46ch] text-[1.05rem] leading-relaxed text-muted">
              AI that takes action, boards that measure progress, spaces for teams, and invites that
              keep one company tenancy.
            </p>
          </div>

          <div className="mt-12 md:mt-14">
            <NextSpaceBento />
          </div>

          <div className="mt-14">
            <Link className={buttonClasses('primary')} to={token ? '/app' : '/register'}>
              {token ? 'Open your dashboard' : 'Get this workspace'}
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-line/60 bg-[#fbfcfe]">
        <div className="mx-auto flex w-full max-w-[1140px] flex-wrap items-center justify-between gap-3 px-8 py-8 sm:px-10 lg:px-12">
          <p className="m-0 font-display text-sm font-bold text-ink">NextSpace</p>
          <p className="m-0 text-sm text-muted">Company work, one clear overview</p>
        </div>
      </footer>
    </div>
  )
}
