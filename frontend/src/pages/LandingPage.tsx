import { Link } from 'react-router-dom'
import { buttonClasses } from '../components/ui/Button'
import { useAuthStore } from '../stores/authStore'

export function LandingPage() {
  const token = useAuthStore((s) => s.token)

  return (
    <div className="relative z-1 mx-auto w-[min(1120px,calc(100%-2rem))] pb-10">
      <header className="fade-up flex items-center justify-between pt-6">
        <div className="font-display text-[1.35rem] font-extrabold tracking-tight text-ink">
          NextSpace
        </div>
        <div className="flex items-center gap-2">
          {token ? (
            <Link className={buttonClasses('primary')} to="/app">
              Open workspace
            </Link>
          ) : (
            <>
              <Link className={buttonClasses('ghost')} to="/login">
                Sign in
              </Link>
              <Link className={buttonClasses('primary')} to="/register">
                Start free
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="fade-up-delay grid max-w-[720px] gap-6 py-12 md:py-16">
        <h1 className="m-0 font-display text-[clamp(2.8rem,7vw,4.5rem)] leading-[0.95] tracking-[-0.045em] text-ink">
          <span className="text-accent">NextSpace</span>
          <br />
          rooms for focused teams
        </h1>
        <p className="m-0 max-w-[38ch] text-[1.12rem] text-muted">
          Register your company, create public or private spaces, and keep every conversation in
          the right place.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link className={buttonClasses('primary')} to={token ? '/app' : '/register'}>
            {token ? 'Go to dashboard' : 'Create your workspace'}
          </Link>
          <Link className={buttonClasses('secondary')} to="/login">
            I already have an account
          </Link>
        </div>
      </section>

      <section className="fade-up-delay grid gap-4 pb-16 md:grid-cols-3">
        {[
          {
            title: 'Company-first tenancy',
            body: 'Every account belongs to a company. Owners manage people, location, and scale.',
          },
          {
            title: 'Typed spaces',
            body: 'Public, specific, or private rooms so access matches how your team actually works.',
          },
          {
            title: 'Ready to ship',
            body: 'FastAPI backend, JWT auth, and a clean React client built for real demos.',
          },
        ].map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-line bg-surface px-5 py-5 shadow-sm"
          >
            <h3 className="m-0 mb-2 font-display text-[1.05rem] text-ink">{feature.title}</h3>
            <p className="m-0 text-[0.92rem] text-muted">{feature.body}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
