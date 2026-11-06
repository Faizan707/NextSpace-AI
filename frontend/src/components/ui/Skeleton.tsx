import { cn } from '../../lib/cn'

interface SkeletonProps {
  className?: string
}

/** Base shimmer block — compose layouts with width/height utilities. */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return <Skeleton className={cn('size-8 shrink-0 rounded-full', className)} />
}

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-3.5 w-full rounded-md', className)} />
}

/** Space card placeholder matching SpacesPage card size. */
export function SpaceCardSkeleton() {
  return (
    <div className="flex h-[280px] w-[250px] flex-col rounded-[22px] border border-line bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <SkeletonText className="h-5 w-3/4" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="size-9 shrink-0 rounded-full" />
      </div>
      <div className="mt-2 flex-1 space-y-2">
        <SkeletonText className="w-full" />
        <SkeletonText className="w-5/6" />
        <SkeletonText className="w-2/3" />
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="flex -space-x-2">
          <SkeletonCircle />
          <SkeletonCircle />
        </div>
        <Skeleton className="size-9 rounded-full" />
      </div>
    </div>
  )
}

export function SpaceCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-4" aria-busy="true" aria-label="Loading spaces">
      {Array.from({ length: count }, (_, i) => (
        <SpaceCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function InviteListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-2" aria-busy="true" aria-label="Loading invites">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface-2 px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <SkeletonText className="h-4 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonText className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

export function CompanyPageSkeleton() {
  return (
    <div className="fade-up rounded-[24px] border border-line bg-surface p-6 shadow-[var(--shadow-panel)] md:p-8" aria-busy="true">
      <Skeleton className="h-3 w-24 rounded-md" />
      <Skeleton className="mt-3 h-9 w-64 max-w-full rounded-lg" />
      <SkeletonText className="mt-3 h-4 w-52" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface-2 px-4 py-4">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="mt-2 h-5 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading form">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-control)]" />
        </div>
      ))}
      <Skeleton className="mt-1 h-12 w-full rounded-full" />
    </div>
  )
}

export function UsersTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Loading users">
      <div className="min-w-full">
        <div className="flex gap-4 border-b border-line px-2 py-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line/70 px-2 py-3">
            <SkeletonText className="h-4 w-28" />
            <SkeletonText className="h-4 w-40" />
            <SkeletonText className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SpaceDetailSectionSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28 rounded-md" />
          <SkeletonText className="h-3.5 w-52" />
        </div>
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: cardCount }, (_, i) => (
          <SpaceCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}

/** Full space detail page placeholder (header + projects/teams/docs cards). */
export function SpaceDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8" aria-busy="true" aria-label="Loading space">
      <section className="fade-up">
        <Skeleton className="h-4 w-28 rounded-md" />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
            <SkeletonText className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </section>
      <SpaceDetailSectionSkeleton cardCount={3} />
      <SpaceDetailSectionSkeleton cardCount={2} />
      <SpaceDetailSectionSkeleton cardCount={2} />
    </div>
  )
}
