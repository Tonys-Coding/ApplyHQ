import { apiFetch } from '@/lib/api'
import type { ResumeEditPlan, Strictness } from '@/types/domain'
import type { ResumeSections } from './editPlan'

/**
 * POST /api/ai/copilot
 *
 * The server also applies the plan and returns its own result, but we ignore
 * that and re-run applyEditPlan on the CLIENT against live store state — that's
 * what lets the canvas update the exact touched nodes without a refetch, and
 * keeps ids resolving against the resume the user is actually looking at.
 */
export function requestCopilotEdit(args: {
  instruction: string
  resume: ResumeSections
  strictness: Strictness
  jobContext: string | null
}): Promise<{ plan: ResumeEditPlan }> {
  return apiFetch<{ plan: ResumeEditPlan }>('/api/ai/copilot', {
    method: 'POST',
    body: JSON.stringify(args),
  })
}

/** POST /api/ai/tailor — full tailoring pass against a target job. */
export function requestTailor(args: {
  jobTitle: string
  company: string
  jobDescription: string
  resume: ResumeSections
  strictness: Strictness
}): Promise<{ plan: ResumeEditPlan }> {
  return apiFetch<{ plan: ResumeEditPlan }>('/api/ai/tailor', {
    method: 'POST',
    body: JSON.stringify(args),
  })
}
