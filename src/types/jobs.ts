/**
 * Normalized job posting — the shape the frontend sees.
 *
 * Deliberately NOT JSearch's raw response. That surface has already moved under
 * us once (/search shipped as /search-v2, `data[]` became `data.jobs[]`), and
 * every component that touched raw fields would have broken. This interface is
 * the seam: when the vendor changes, only the mapper changes.
 */
export interface JobPosting {
  id: string
  title: string
  company: string
  companyLogo: string | null
  /** Pre-joined by the API, e.g. "Dallas, TX". */
  location: string | null
  city: string | null
  state: string | null
  isRemote: boolean
  /** Where to actually apply. May be an aggregator rather than the employer. */
  applyLink: string
  applyIsDirect: boolean
  publisher: string | null
  employmentType: string | null
  /** Full JD text — fed to the Keyword Matrix. */
  description: string
  /** First ~280 chars, for card display. */
  snippet: string
  postedAt: string | null
  postedAtTimestamp: number | null
  /** Human relative string straight from the API, e.g. "1 day ago". */
  postedAtLabel: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryPeriod: string | null
  /** Which recruiting cycle(s) the text mentions. Heuristic — see termPresets. */
  terms: TermKey[]
}

export interface JobSearchResult {
  jobs: JobPosting[]
  /** Opaque; pass back as `cursor` for the next page. null = no more. */
  cursor: string | null
  /** True when served from cache — nothing was spent against the quota. */
  cached: boolean
  /** Requests left this month, straight from the RapidAPI headers. */
  quotaRemaining: number | null
}

export type TermKey = 'fall-2026' | 'summer-2027' | 'spring-2027'
