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
        className="pointer-events-none absolute -inset-x-8 -inset-y-10 bg-[radial-gradient(520px_280px_at_70%_20%,rgba(20,184,166,0.16),transparent_60%),radial-gradient(420px_240px_at_20%_80%,rgba(99,102,241,0.14),transparent_55%)]"
      />

      <motion.div
        className="relative"
        initial={reduceMotion ? false : { opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <p className="m-0 font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
              Dashboard overview
            </p>
            <p className="mt-0.5 m-0 text-sm text-muted">Arbisoft · live company rollup</p>
          </div>
          <span className="rounded-full border border-[#e8edf3] bg-white px-3 py-1 text-xs font-semibold text-muted shadow-sm">
            Inside the app
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-[20px] border border-[#e8edf3] bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:col-span-1">
            <p className="m-0 text-sm font-bold text-ink">Projects analytics</p>
            <p className="mt-1 m-0 text-xs text-muted">
              Total tasks <span className="font-display font-bold text-ink">42</span>
            </p>
            <div className="mt-3 space-y-2.5">
              <TrackBar
                label="Completed"
                value={24}
                max={42}
                color={TEAL}
                reduceMotion={reduceMotion}
                delay={0.35}
              />
              <TrackBar
                label="In progress"
                value={11}
                max={42}
                color={INDIGO}
                reduceMotion={reduceMotion}
                delay={0.45}
              />
              <TrackBar
                label="Todo"
                value={7}
                max={42}
                color="#cbd5e1"
                reduceMotion={reduceMotion}
                delay={0.55}
              />
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
      </motion.div>
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
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <div className="relative z-1 min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_620px_at_88%_0%,rgba(20,184,166,0.14),transparent_55%),radial-gradient(720px_420px_at_0%_30%,rgba(99,102,241,0.12),transparent_50%),linear-gradient(180deg,#f7fafc_0%,#eef3f8_55%,#e8eef6_100%)]"
      />

      <header className="relative mx-auto flex w-[min(1180px,calc(100%-2rem))] items-center justify-between pt-6 md:pt-8">
        <p className="font-display text-[1.2rem] font-extrabold tracking-tight text-ink md:text-[1.35rem]">
          NextSpace
        </p>
        <div className="flex items-center gap-2">
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

      <section className="relative mx-auto grid min-h-[calc(100dvh-5.5rem)] w-[min(1180px,calc(100%-2rem))] items-center gap-10 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)] lg:gap-12 lg:py-8">
        <div className="relative min-w-0 max-w-xl">
          <motion.p
            className="m-0 font-display text-[clamp(2.2rem,4.4vw,3.1rem)] font-extrabold leading-[0.92] tracking-[-0.045em] text-ink"
            {...rise(0.05)}
          >
            NextSpace
          </motion.p>
          <motion.h1
            className="mt-4 m-0 max-w-[15ch] font-display text-[clamp(1.35rem,2.6vw,1.85rem)] font-bold leading-[1.2] tracking-[-0.03em] text-ink/85"
            {...rise(0.12)}
          >
            The company dashboard your team opens every day
          </motion.h1>
          <motion.p
            className="mt-4 m-0 max-w-[36ch] text-[1.05rem] leading-relaxed text-muted"
            {...rise(0.2)}
          >
            After login you get a live overview of spaces, projects, priorities, and who’s carrying
            the work — not another empty home screen.
          </motion.p>
          <motion.div className="mt-8 flex flex-wrap gap-3" {...rise(0.28)}>
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

        <div className="relative min-w-0" aria-hidden>
          <DashboardPreview reduceMotion={reduceMotion} />
        </div>
      </section>

      <section className="relative border-t border-line/70 bg-white/55 backdrop-blur-sm">
        <div className="mx-auto w-[min(1180px,calc(100%-2rem))] py-16 md:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-accent">Inside NextSpace</p>
          <h2 className="mt-2 max-w-[20ch] font-display text-[clamp(1.7rem,3vw,2.35rem)] font-bold tracking-tight text-ink">
            Same soft dashboard, with your real company data
          </h2>
          <p className="mt-3 max-w-[48ch] text-muted">
            Invite the team, open spaces, move work on boards — everything rolls up into the
            overview you previewed above.
          </p>

          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              {
                step: '01',
                title: 'Company tenancy',
                body: 'Register once. Owners invite members by email and keep one shared workspace.',
              },
              {
                step: '02',
                title: 'Spaces & boards',
                body: 'Run projects on stages. Progress updates as tasks move from todo to done.',
              },
              {
                step: '03',
                title: 'Live dashboard',
                body: 'Completion, priorities, space load, and team capacity — ready the moment you sign in.',
              },
            ].map((item) => (
              <li key={item.step} className="list-none">
                <p className="m-0 font-display text-sm font-bold tracking-[0.12em] text-accent">
                  {item.step}
                </p>
                <h3 className="mt-3 m-0 font-display text-xl font-bold text-ink">{item.title}</h3>
                <p className="mt-2 m-0 text-[0.95rem] leading-relaxed text-muted">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12">
            <Link className={buttonClasses('primary')} to={token ? '/app' : '/register'}>
              {token ? 'Open your dashboard' : 'Get this dashboard'}
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-line/70">
        <div className="mx-auto flex w-[min(1180px,calc(100%-2rem))] flex-wrap items-center justify-between gap-3 py-8">
          <p className="m-0 font-display text-sm font-bold text-ink">NextSpace</p>
          <p className="m-0 text-sm text-muted">Company work, one clear overview</p>
        </div>
      </footer>
    </div>
  )
}
