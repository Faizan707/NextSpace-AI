import { CompanyPageSkeleton } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import { useCompanyStore } from '../stores/companyStore'

export function CompanyPage() {
  const user = useAuthStore((s) => s.user)
  const company = useCompanyStore((s) => s.company)
  const loading = useCompanyStore((s) => s.loading)
  const display = company ?? user?.company

  if (loading && !display) {
    return (
      <div className="mx-auto max-w-3xl">
        <CompanyPageSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <section className="fade-up rounded-[24px] border border-line bg-surface p-6 shadow-[var(--shadow-panel)] md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Company info</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
          {display?.name || 'Your company'}
        </h1>
        <p className="mt-2 text-muted">Details for your tenant workspace.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoCard label="Location" value={display?.location || '—'} />
          <InfoCard
            label="Team size"
            value={
              display?.employee_count != null ? `${display.employee_count} people` : '—'
            }
          />
          <InfoCard label="Your role" value={user?.role?.replace('_', ' ') || '—'} />
          <InfoCard label="Your email" value={user?.email || '—'} />
        </div>
      </section>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-4 py-4">
      <p className="text-[0.72rem] uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{value}</p>
    </div>
  )
}
