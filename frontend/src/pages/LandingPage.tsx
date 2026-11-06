import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { buttonClasses } from '../components/ui/Button'
import { useAuthStore } from '../stores/authStore'

function HeroVisual({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
      {/* Soft depth layers behind the main plane */}
      <div
        aria-hidden
        className="absolute -right-6 top-10 hidden h-[78%] w-[88%] rounded-[36px] bg-accent/10 blur-[2px] lg:block"
      />
      <div
        aria-hidden
        className="absolute -bottom-4 left-8 hidden h-24 w-[70%] rounded-full bg-ink/[0.04] blur-2xl lg:block"
      />

      <motion.div
        className="relative overflow-hidden rounded-[32px] border border-line bg-surface shadow-[0_24px_60px_rgba(15,23,42,0.1)]"
        initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(700px_320px_at_100%_0%,rgba(37,99,235,0.14),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)]" />

        {/* Project header */}
        <div className="relative flex items-start justify-between gap-4 border-b border-line/80 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-accent">
              Project
            </p>
            <p className="mt-1 m-0 truncate font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Q1 product launch
            </p>
            <p className="mt-1 m-0 text-sm text-muted">Marketing space · 5 members</p>
          </div>
          <div className="relative grid size-[4.25rem] shrink-0 place-items-center">
            <svg viewBox="0 0 72 72" className="absolute inset-0 size-full -rotate-90" aria-hidden>
              <circle cx="36" cy="36" r="30" fill="none" stroke="#eef1f6" strokeWidth="7" />
              <motion.circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 30}`}
                initial={reduceMotion ? false : { strokeDashoffset: 2 * Math.PI * 30 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - 0.67) }}
                transition={{ duration: 1.1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <span className="relative font-display text-sm font-bold text-ink">67%</span>
          </div>
        </div>

        {/* Stage journey — not a cramped 3-col board */}
        <div className="relative space-y-5 px-5 py-6 sm:px-6">
          <div className="flex items-center gap-2">
            {['Todo', 'In Progress', 'Done'].map((stage, index) => (
              <div key={stage} className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={
                    index === 1
                      ? 'rounded-full bg-accent px-2.5 py-1 text-[0.68rem] font-bold text-ink-on-accent'
                      : 'rounded-full bg-bg-elevated px-2.5 py-1 text-[0.68rem] font-bold text-muted'
                  }
                >
                  {stage}
                </div>
                {index < 2 ? (
                  <div className="h-px min-w-3 flex-1 bg-line" aria-hidden />
                ) : null}
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-[24px] bg-bg-elevated/80 p-4 sm:p-5">
            <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted">
              Now moving
            </p>
            <motion.div
              className="mt-3 rounded-[20px] border border-line bg-surface px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
              animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 font-display text-base font-bold text-ink">Ship space invites</p>
                  <p className="mt-1 m-0 text-sm text-muted">In Progress · assigned to Faizan</p>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                  F
                </span>
              </div>
            </motion.div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { title: 'Brief the launch', stage: 'Todo' },
                { title: 'Auth + company setup', stage: 'Done' },
              ].map((task, index) => (
                <motion.div
                  key={task.title}
                  className="rounded-[18px] border border-transparent bg-surface/70 px-3.5 py-3"
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + index * 0.1, duration: 0.45 }}
                >
                  <p className="m-0 truncate text-sm font-semibold text-ink">{task.title}</p>
                  <p className="mt-1 m-0 text-xs font-medium text-muted">{task.stage}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="m-0 text-center text-xs text-muted">
            Progress updates from board stages — Todo 0%, active 50%, Done 100%
          </p>
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_560px_at_85%_8%,rgba(37,99,235,0.14),transparent_55%),radial-gradient(640px_380px_at_0%_100%,rgba(17,24,39,0.04),transparent_50%),linear-gradient(180deg,#f8fafc_0%,#eef3f9_100%)]"
      />

      <header className="relative mx-auto flex w-[min(1120px,calc(100%-2rem))] items-center justify-between pt-6 md:pt-8">
        <p className="font-display text-[1.2rem] font-extrabold tracking-tight text-ink md:text-[1.35rem]">
          NextSpace
        </p>
        <div className="flex items-center gap-2">
          {token ? (
            <Link className={buttonClasses('primary', undefined, 'sm')} to="/app">
              Open workspace
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

      <section className="relative mx-auto grid min-h-[calc(100dvh-5.5rem)] w-[min(1120px,calc(100%-2rem))] items-center gap-12 py-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-8">
        <div className="relative min-w-0 max-w-xl">
          <motion.p
            className="m-0 font-display text-[clamp(2rem,4vw,2.85rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-ink"
            {...rise(0.05)}
          >
            NextSpace
          </motion.p>
          <motion.h1
            className="mt-4 m-0 max-w-[16ch] font-display text-[clamp(1.4rem,2.8vw,1.9rem)] font-bold leading-[1.2] tracking-[-0.03em] text-ink/85"
            {...rise(0.12)}
          >
            Rooms and boards for focused teams
          </motion.h1>
          <motion.p
            className="mt-4 m-0 max-w-[34ch] text-[1.05rem] leading-relaxed text-muted"
            {...rise(0.2)}
          >
            Create your company, open spaces, and watch project progress follow the board —
            invite to done.
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
          <HeroVisual reduceMotion={reduceMotion} />
        </div>
      </section>

      <section className="relative border-t border-line/70 bg-surface/60 backdrop-blur-sm">
        <div className="mx-auto w-[min(1120px,calc(100%-2rem))] py-16 md:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-accent">How it fits</p>
          <h2 className="mt-2 max-w-[18ch] font-display text-[clamp(1.7rem,3vw,2.35rem)] font-bold tracking-tight text-ink">
            One workspace from company to done
          </h2>
          <p className="mt-3 max-w-[46ch] text-muted">
            Spaces hold people and documents. Projects open a board. Progress follows the stages
            your team actually uses.
          </p>

          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              {
                step: '01',
                title: 'Company tenancy',
                body: 'Register once. Owners invite the team and keep everyone under one roof.',
              },
              {
                step: '02',
                title: 'Typed spaces',
                body: 'Public, specific, or private rooms so access matches how you already work.',
              },
              {
                step: '03',
                title: 'Live project boards',
                body: 'Todo, In Progress, Done — plus custom stages — with progress that updates as tasks move.',
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
        </div>
      </section>

      <footer className="relative border-t border-line/70">
        <div className="mx-auto flex w-[min(1120px,calc(100%-2rem))] flex-wrap items-center justify-between gap-3 py-8">
          <p className="m-0 font-display text-sm font-bold text-ink">NextSpace</p>
          <p className="m-0 text-sm text-muted">Workspace for modern teams</p>
        </div>
      </footer>
    </div>
  )
}
