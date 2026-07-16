import { getUserFromRequest, unauthorized } from '../lib/auth'
import { DEFAULT_SEARCH, JSearchError, searchJobs } from '../lib/jsearch'
import type { TermKey } from '../../src/types/jobs'

const VALID_TERMS: TermKey[] = ['fall-2026', 'spring-2027', 'summer-2027']

/**
 * GET /api/jobs/search
 *
 * Auth-gated even though job listings are public — the RapidAPI quota is a
 * shared, exhaustible resource billed to us. An open endpoint is an open
 * invitation to burn 200 requests/month in an afternoon.
 */
export async function searchJobsRoute(req: Request): Promise<Response> {
  const user = await getUserFromRequest(req)
  if (!user) return unauthorized()

  const url = new URL(req.url)
  const p = url.searchParams

  const terms = (p.get('terms') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is TermKey => VALID_TERMS.includes(t as TermKey))

  try {
    const result = await searchJobs({
      query: p.get('query') || DEFAULT_SEARCH.query,
      location: p.get('location') ?? DEFAULT_SEARCH.location,
      country: p.get('country') ?? DEFAULT_SEARCH.country,
      datePosted:
        (p.get('datePosted') as 'all' | 'today' | '3days' | 'week' | 'month' | null) ??
        DEFAULT_SEARCH.datePosted,
      remoteOnly: p.get('remoteOnly') === 'true',
      employmentTypes: p.get('employmentTypes') ?? undefined,
      cursor: p.get('cursor') ?? undefined,
      terms,
    })

    return Response.json(result, {
      // Lets the browser and any intermediary reuse a response too, on top of
      // our disk cache.
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  } catch (err) {
    if (err instanceof JSearchError) {
      console.error('[jobs]', err.message)
      // 429 is the one the UI must handle distinctly: it means the monthly
      // budget is gone, and retrying will not help until it resets.
      const status = err.status === 429 ? 429 : 502
      return Response.json(
        {
          error:
            err.status === 429
              ? 'JSearch monthly quota exhausted. Results resume when the quota resets.'
              : 'Job search is temporarily unavailable.',
          quotaRemaining: err.quotaRemaining,
        },
        { status },
      )
    }
    console.error('[jobs] unexpected:', err)
    return Response.json({ error: 'Job search failed.' }, { status: 500 })
  }
}
