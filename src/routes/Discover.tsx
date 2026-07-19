import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Compass, Database, Gauge } from 'lucide-react'
import type { TermKey } from '@/types/jobs'
import { useJobSearch, type JobSearchInput } from '@/features/discovery/hooks/useJobSearch'
import {
  SearchControls,
  type SearchDraft,
} from '@/features/discovery/components/SearchControls'
import { JobCard } from '@/features/discovery/components/JobCard'
import { useJobStore, selectSavedApplyLinks } from '@/stores/useJobStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

const INITIAL_DRAFT: SearchDraft = {
  query: 'software engineer intern',
  location: 'Dallas, TX',
  datePosted: 'month',
}

export function Discover() {
  // Draft = what's in the inputs. Committed = what we've actually searched for.
  // They're separate so typing never fires a request; only Search commits.
  const [draft, setDraft] = useState<SearchDraft>(INITIAL_DRAFT)
  const [committed, setCommitted] = useState<JobSearchInput>({ ...INITIAL_DRAFT, terms: [] })
  const [activeTerms, setActiveTerms] = useState<TermKey[]>([])

  const applications = useJobStore((s) => s.applications)
  const fetchApplications = useJobStore((s) => s.fetchApplications)
  const savedLinks = useMemo(() => selectSavedApplyLinks(applications), [applications])

  // The board may not be loaded if the user lands on Discover first; we need it
  // to know which postings are already saved.
  useEffect(() => {
    if (applications.length === 0) void fetchApplications()
  }, [applications.length, fetchApplications])

  const { data, isLoading, isFetching, isError, error } = useJobSearch(committed)

  // Client-side term filter over already-fetched results. Highlighting always
  // happens (JobCard reads job.terms); this only narrows the list when a chip
  // is active.
  const jobs = useMemo(() => {
    const all = data?.jobs ?? []
    if (activeTerms.length === 0) return all
    return all.filter((j) => j.terms.some((t) => activeTerms.includes(t)))
  }, [data?.jobs, activeTerms])

  function toggleTerm(term: TermKey) {
    setActiveTerms((prev) =>
      prev.includes(term) ? prev.filter((t) => t !== term) : [...prev, term],
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
        <PageHeader title="Discover" subtitle="Live roles from across the web, matched to your cycle.">
          <QuotaPill cached={data?.cached} remaining={data?.quotaRemaining ?? null} />
        </PageHeader>

        <SearchControls
            draft={draft}
            onDraftChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            onSubmit={() => setCommitted({ ...draft, terms: [] })}
            activeTerms={activeTerms}
            onToggleTerm={toggleTerm}
          />

          {isError ? (
            <ErrorState message={(error as Error)?.message} />
          ) : isLoading ? (
            <CardGridSkeleton />
          ) : jobs.length === 0 ? (
            <EmptyState narrowed={activeTerms.length > 0 && (data?.jobs.length ?? 0) > 0} />
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {jobs.length} {jobs.length === 1 ? 'role' : 'roles'}
                </span>
                {isFetching && <span className="text-xs">· refreshing…</span>}
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    saved={savedLinks.has(job.applyLink)}
                    siblings={jobs}
                  />
                ))}
              </div>
            </>
          )}
      </div>
    </div>
  )
}

function QuotaPill({ cached, remaining }: { cached?: boolean; remaining: number | null }) {
  if (cached) {
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        <Database className="size-3" />
        Cached
      </Badge>
    )
  }
  if (remaining == null) return null
  return (
    <Badge
      variant={remaining < 20 ? 'destructive' : 'secondary'}
      className="gap-1 font-normal"
    >
      <Gauge className="size-3" />
      {remaining} left
    </Badge>
  )
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-panel flex flex-col gap-4 rounded-lg p-5">
          <div className="flex gap-4">
            <Skeleton className="size-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ narrowed }: { narrowed: boolean }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed py-16 text-center">
      <div className="flex max-w-sm flex-col items-center gap-2">
        <Compass className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {narrowed
            ? 'No results mention the selected cycle. Cycle detection is text-based, so many valid roles simply do not state it — clear the filter to see everything.'
            : 'No roles found. Try broadening the query — very specific searches like "SWE intern Fall 2026 Dallas" often return nothing on JSearch.'}
        </p>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message?: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-destructive/30 bg-destructive/5 py-16 text-center">
      <div className="flex max-w-sm flex-col items-center gap-2">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {message ?? 'Job search is temporarily unavailable.'}
        </p>
      </div>
    </div>
  )
}
