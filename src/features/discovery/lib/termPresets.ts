import type { TermKey } from '@/types/jobs'

/**
 * Recruiting-cycle detection.
 *
 * JSearch has NO concept of an internship term — there is no parameter to ask
 * for "Fall 2026". So this is unavoidably a text heuristic: we bias the query
 * string, then scan the returned title + description for cycle markers.
 *
 * Be clear-eyed about the failure modes: a posting that says "Summer 2027" only
 * in an image, or in an ATS page behind the apply link, will be missed. A
 * posting mentioning "Summer 2027" as a *conversion* date on a Fall 2026 req
 * will be tagged with both. Treat these tags as a filter aid, not a guarantee.
 */

interface TermPreset {
  key: TermKey
  label: string
  /** Lowercased regexes tested against title + description. */
  markers: RegExp[]
  /** Appended to the JSearch query to bias retrieval. */
  queryHint: string
}

export const TERM_PRESETS: TermPreset[] = [
  {
    key: 'fall-2026',
    label: 'Fall 2026',
    markers: [/\bfall\s*(of\s*)?[''‛]?26\b/i, /\bfall\s*(of\s*)?2026\b/i, /\bautumn\s*2026\b/i],
    queryHint: 'fall 2026',
  },
  {
    key: 'spring-2027',
    label: 'Spring 2027',
    markers: [/\bspring\s*(of\s*)?[''‛]?27\b/i, /\bspring\s*(of\s*)?2027\b/i],
    queryHint: 'spring 2027',
  },
  {
    key: 'summer-2027',
    label: 'Summer 2027',
    markers: [/\bsummer\s*(of\s*)?[''‛]?27\b/i, /\bsummer\s*(of\s*)?2027\b/i],
    queryHint: 'summer 2027',
  },
]

export const TERM_LABELS: Record<TermKey, string> = {
  'fall-2026': 'Fall 2026',
  'spring-2027': 'Spring 2027',
  'summer-2027': 'Summer 2027',
}

/** Which cycles this posting's text mentions. Empty = none detected. */
export function detectTerms(title: string, description: string): TermKey[] {
  const haystack = `${title}\n${description}`
  return TERM_PRESETS.filter((p) => p.markers.some((re) => re.test(haystack))).map((p) => p.key)
}

export function termQueryHint(terms: TermKey[]): string {
  if (terms.length === 0) return ''
  return TERM_PRESETS.filter((p) => terms.includes(p.key))
    .map((p) => p.queryHint)
    .join(' OR ')
}
