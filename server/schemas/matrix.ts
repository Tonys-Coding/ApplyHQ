import { z } from 'zod'

/**
 * Keyword Matrix & Fit Score.
 *
 * ── Why the model does NOT return fitScore ──────────────────────────────────
 *
 * You asked for a schema where the model returns a 0-100 fitScore directly.
 * I've split that: the model does *extraction and judgement* (which keywords
 * matter, are they present, where), and fitScore is computed from that in code.
 *
 * The reason is calibration. Asked for a bare 0-100, an LLM will return 72 on
 * one run and 65 on the next for byte-identical input — it has no stable
 * yardstick, and the number moves with prompt phrasing and temperature. Users
 * read that as the app being broken, and worse, they'd tune a real resume
 * against a number that is partly noise.
 *
 * Extraction is the thing models are reliable at. Arithmetic is the thing code
 * is reliable at. So: same response shape you asked for, but fitScore is now
 * deterministic, reproducible, and explainable — you can point at exactly which
 * required keyword dragged it down.
 */

export const KeywordImportance = z.enum(['required', 'preferred', 'nice_to_have'])
export type KeywordImportance = z.infer<typeof KeywordImportance>

export const KeywordCategory = z.enum([
  'language',
  'framework_or_library',
  'tool_or_platform',
  'concept',
  'domain',
  'credential',
  'soft_skill',
])

export const KeywordAssessment = z.object({
  term: z.string().describe('The keyword exactly as the job description words it.'),
  importance: KeywordImportance.describe(
    'required = the JD states it as a must-have. preferred = listed as desired. ' +
      'nice_to_have = mentioned only in passing.',
  ),
  category: KeywordCategory,
  present_in_resume: z.boolean().describe(
    'True ONLY if the resume genuinely demonstrates this. A near-miss ' +
      '(Java when the JD wants JavaScript) is false.',
  ),
  evidence: z
    .string()
    .nullable()
    .describe('Short quote from the resume proving it. null when present_in_resume is false.'),
})

export const KeywordMatrixSchema = z.object({
  keywords: z
    .array(KeywordAssessment)
    .describe('Every meaningful requirement in the JD. Aim for 12-25. Do not pad.'),
  summary: z.string().describe('One or two sentences: the single biggest gap and strength.'),
})

export type KeywordMatrix = z.infer<typeof KeywordMatrixSchema>

/** Deterministic weights. Missing a hard requirement must cost more than a nicety. */
const WEIGHTS: Record<KeywordImportance, number> = {
  required: 3,
  preferred: 2,
  nice_to_have: 1,
}

export interface FitReport {
  fitScore: number
  matchedKeywords: string[]
  missingKeywords: string[]
  /** Missing `required` terms — what to fix first. */
  criticalGaps: string[]
  keywords: KeywordMatrix['keywords']
  summary: string
}

/**
 * Weighted coverage, computed in code from the model's extraction.
 * Same input -> same score, every time.
 */
export function computeFitReport(matrix: KeywordMatrix): FitReport {
  const { keywords, summary } = matrix

  let earned = 0
  let possible = 0
  for (const k of keywords) {
    const w = WEIGHTS[k.importance]
    possible += w
    if (k.present_in_resume) earned += w
  }

  return {
    // No keywords extracted means we know nothing — report 0, not 100. An empty
    // JD must never look like a perfect match.
    fitScore: possible === 0 ? 0 : Math.round((earned / possible) * 100),
    matchedKeywords: keywords.filter((k) => k.present_in_resume).map((k) => k.term),
    missingKeywords: keywords.filter((k) => !k.present_in_resume).map((k) => k.term),
    criticalGaps: keywords
      .filter((k) => !k.present_in_resume && k.importance === 'required')
      .map((k) => k.term),
    keywords,
    summary,
  }
}
