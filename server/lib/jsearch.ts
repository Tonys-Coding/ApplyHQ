import { rapidApiConfig } from './env'
import { cacheGet, cacheSet } from './cache'
import { detectTerms } from '../../src/features/discovery/lib/termPresets'
import type { JobPosting, JobSearchResult, TermKey } from '../../src/types/jobs'

/**
 * JSearch (RapidAPI) client.
 *
 * Every field name below was read off a live response, not the docs — the docs
 * describe an older surface. Verified 2026-07-15:
 *   - endpoint is /search-v2   (/search returns 404)
 *   - payload is data.jobs[]   (not data[])
 *   - paging is an opaque data.cursor string (num_pages is gone)
 */

const SEARCH_TTL_SECONDS = 6 * 60 * 60 // 6h — quota is 200/month, ~6.6/day

export interface JobSearchParams {
  query: string
  location?: string
  country?: string
  datePosted?: 'all' | 'today' | '3days' | 'week' | 'month'
  remoteOnly?: boolean
  employmentTypes?: string
  cursor?: string
  /** Post-filter: keep only postings whose text mentions these cycles. */
  terms?: TermKey[]
}

/**
 * Your stated target. Note "software engineering intern in Dallas, TX" returned
 * ZERO results on a live probe while "software engineer in Dallas" returned 10,
 * so this default is intentionally broader than the literal ask — we widen the
 * net at the API and narrow with `terms` locally, where filtering is free.
 */
export const DEFAULT_SEARCH: JobSearchParams = {
  query: 'software engineer intern',
  location: 'Dallas, TX',
  country: 'us',
  datePosted: 'month',
}

interface RawJob {
  job_id: string
  job_title: string
  employer_name: string
  employer_logo: string | null
  job_publisher: string | null
  job_employment_type: string | null
  job_apply_link: string
  job_apply_is_direct: boolean
  job_description: string
  job_is_remote: boolean
  job_posted_at: string | null
  job_posted_at_timestamp: number | null
  job_posted_at_datetime_utc: string | null
  job_location: string | null
  job_city: string | null
  job_state: string | null
  job_min_salary: number | null
  job_max_salary: number | null
  job_salary_period: string | null
}

function toSnippet(description: string): string {
  const flat = description.replace(/\s+/g, ' ').trim()
  return flat.length > 280 ? `${flat.slice(0, 277)}…` : flat
}

function mapJob(raw: RawJob): JobPosting {
  const description = raw.job_description ?? ''
  return {
    id: raw.job_id,
    title: raw.job_title,
    company: raw.employer_name,
    companyLogo: raw.employer_logo,
    location: raw.job_location,
    city: raw.job_city,
    state: raw.job_state,
    isRemote: Boolean(raw.job_is_remote),
    applyLink: raw.job_apply_link,
    applyIsDirect: Boolean(raw.job_apply_is_direct),
    publisher: raw.job_publisher,
    employmentType: raw.job_employment_type,
    description,
    snippet: toSnippet(description),
    postedAt: raw.job_posted_at_datetime_utc,
    postedAtTimestamp: raw.job_posted_at_timestamp,
    postedAtLabel: raw.job_posted_at,
    // Verified null on every live result — Google for Jobs rarely exposes comp.
    // The UI must treat "no salary" as the normal case, not an error.
    salaryMin: raw.job_min_salary,
    salaryMax: raw.job_max_salary,
    salaryPeriod: raw.job_salary_period,
    terms: detectTerms(raw.job_title ?? '', description),
  }
}

function cacheKey(p: JobSearchParams): string {
  return JSON.stringify({
    q: p.query,
    l: p.location,
    c: p.country,
    d: p.datePosted,
    r: p.remoteOnly,
    e: p.employmentTypes,
    cur: p.cursor,
  })
}

export async function searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
  const key = cacheKey(params)

  const cached = await cacheGet<{ jobs: JobPosting[]; cursor: string | null }>('jsearch', key)
  if (cached) {
    return { ...cached, cached: true, quotaRemaining: null }
  }

  const { key: apiKey, host } = rapidApiConfig()
  const url = new URL(`https://${host}/search-v2`)

  // JSearch takes location inside the query string ("<role> in <place>") rather
  // than as a parameter.
  const q = params.location ? `${params.query} in ${params.location}` : params.query
  url.searchParams.set('query', q)
  url.searchParams.set('country', params.country ?? 'us')
  if (params.datePosted && params.datePosted !== 'all') {
    url.searchParams.set('date_posted', params.datePosted)
  }
  if (params.remoteOnly) url.searchParams.set('work_from_home', 'true')
  if (params.employmentTypes) url.searchParams.set('employment_types', params.employmentTypes)
  if (params.cursor) url.searchParams.set('cursor', params.cursor)

  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': host },
  })

  const quotaRemaining = Number(res.headers.get('x-ratelimit-requests-remaining') ?? NaN)
  const quota = Number.isNaN(quotaRemaining) ? null : quotaRemaining

  if (!res.ok) {
    const body = await res.text()
    throw new JSearchError(`JSearch ${res.status}: ${body.slice(0, 200)}`, res.status, quota)
  }

  const json = (await res.json()) as {
    status?: string
    data?: { jobs?: RawJob[]; cursor?: string | null }
  }

  const jobs = (json.data?.jobs ?? []).map(mapJob)
  const cursor = json.data?.cursor ?? null

  if (quota !== null && quota < 20) {
    console.warn(`[jsearch] QUOTA LOW: ${quota} requests left this month`)
  }

  // Cache before term filtering: the filter is free and local, so caching the
  // unfiltered page lets a different term selection reuse the same quota spend.
  await cacheSet('jsearch', key, { jobs, cursor }, SEARCH_TTL_SECONDS)

  return { jobs: applyTermFilter(jobs, params.terms), cursor, cached: false, quotaRemaining: quota }
}

export function applyTermFilter(jobs: JobPosting[], terms?: TermKey[]): JobPosting[] {
  if (!terms || terms.length === 0) return jobs
  return jobs.filter((j) => j.terms.some((t) => terms.includes(t)))
}

export class JSearchError extends Error {
  readonly status: number
  readonly quotaRemaining: number | null

  constructor(message: string, status: number, quotaRemaining: number | null) {
    super(message)
    this.name = 'JSearchError'
    this.status = status
    this.quotaRemaining = quotaRemaining
  }
}
