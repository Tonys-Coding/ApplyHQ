import { useQuery } from '@tanstack/react-query'
import { apiFetch, ApiError } from '@/lib/api'
import type { JobSearchResult, TermKey } from '@/types/jobs'

export interface JobSearchInput {
  query: string
  location: string
  datePosted?: 'all' | 'today' | '3days' | 'week' | 'month'
  remoteOnly?: boolean
  terms?: TermKey[]
  cursor?: string
}

/** Your stated target: SWE internships, Dallas-first. */
export const DEFAULT_SEARCH_INPUT: JobSearchInput = {
  query: 'software engineer intern',
  location: 'Dallas, TX',
  datePosted: 'month',
  terms: [],
}

function toSearchParams(input: JobSearchInput): string {
  const p = new URLSearchParams()
  p.set('query', input.query)
  if (input.location) p.set('location', input.location)
  if (input.datePosted) p.set('datePosted', input.datePosted)
  if (input.remoteOnly) p.set('remoteOnly', 'true')
  if (input.terms?.length) p.set('terms', input.terms.join(','))
  if (input.cursor) p.set('cursor', input.cursor)
  return p.toString()
}

/**
 * Stale-while-revalidate over the job feed.
 *
 * The numbers here are set by a hard external constraint, not taste: the
 * JSearch free tier allows 200 requests PER MONTH — about 6 a day. React
 * Query's defaults (refetch on window focus, on mount, on reconnect) would
 * drain that in a single working session of alt-tabbing.
 *
 * So: long staleTime, no focus refetch, no retries on quota errors. The server
 * also caches to disk for 6h, meaning most of these never reach RapidAPI at all.
 */
export function useJobSearch(input: JobSearchInput, enabled = true) {
  return useQuery({
    queryKey: ['jobs', input],
    queryFn: () => apiFetch<JobSearchResult>(`/api/jobs/search?${toSearchParams(input)}`),
    enabled: enabled && input.query.trim().length > 0,

    staleTime: 30 * 60 * 1000, // 30m — server cache is 6h behind this anyway
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,

    retry: (failureCount, error) => {
      // Retrying an exhausted quota just wastes time — it cannot succeed until
      // the month rolls over. Same for auth failures.
      if (error instanceof ApiError && (error.status === 429 || error.status === 401)) {
        return false
      }
      return failureCount < 2
    },
  })
}
