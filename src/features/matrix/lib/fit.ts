import { apiFetch } from '@/lib/api'
import type { ResumeSections } from '@/features/resume/lib/editPlan'

/** Mirrors server/schemas/matrix.ts FitReport (the deterministic, code-computed score). */
export type KeywordImportance = 'required' | 'preferred' | 'nice_to_have'

export interface KeywordAssessment {
  term: string
  importance: KeywordImportance
  category: string
  present_in_resume: boolean
  evidence: string | null
}

export interface FitReport {
  fitScore: number
  matchedKeywords: string[]
  missingKeywords: string[]
  /** Missing `required` terms — the ones actually dragging the score down. */
  criticalGaps: string[]
  keywords: KeywordAssessment[]
  summary: string
}

/**
 * POST /api/ai/fit-score
 *
 * Sends the resume as structured sections; the server flattens it to text and
 * runs the Matcher, then computes the score deterministically. We send sections
 * rather than pre-flattened text so hidden nodes are excluded server-side, in
 * one place.
 */
export function requestFitScore(args: {
  jobDescription: string
  resume: ResumeSections
}): Promise<FitReport> {
  return apiFetch<FitReport>('/api/ai/fit-score', {
    method: 'POST',
    body: JSON.stringify(args),
  })
}
