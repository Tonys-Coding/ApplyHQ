import { getUserFromRequest, unauthorized } from '../lib/auth'
import {
  AIError,
  calculateFitScore,
  generateTailoredResume,
  handleCopilotEdit,
  resumeToText,
  structureResume,
} from '../lib/ai'
import type { ResumeSections } from '../lib/applyEditPlan'
import type { Strictness } from '../../src/types/domain'

const STRICTNESS: Strictness[] = ['strict', 'balanced', 'creative']

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 })
}

/** Every AI route costs real money per call, so nothing runs before auth. */
async function guard(req: Request) {
  const user = await getUserFromRequest(req)
  return user ? null : unauthorized()
}

function readStrictness(value: unknown): Strictness {
  // Default strict, not balanced: the conservative failure mode on someone's
  // resume is doing too little, never too much.
  return STRICTNESS.includes(value as Strictness) ? (value as Strictness) : 'strict'
}

function isResumeSections(v: unknown): v is ResumeSections {
  const r = v as ResumeSections
  return (
    !!r &&
    Array.isArray(r.education) &&
    Array.isArray(r.technical_projects_and_experience) &&
    Array.isArray(r.other_work_history) &&
    Array.isArray(r.skills_and_keywords)
  )
}

async function handleAI<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    return Response.json(await fn())
  } catch (err) {
    if (err instanceof AIError) {
      console.error('[ai]', err.message)
      return Response.json({ error: err.message }, { status: 502 })
    }
    console.error('[ai] unexpected:', err)
    return Response.json({ error: 'AI request failed.' }, { status: 500 })
  }
}

/** POST /api/ai/fit-score  { jobDescription, resume } */
export async function fitScoreRoute(req: Request): Promise<Response> {
  const denied = await guard(req)
  if (denied) return denied

  const body = (await req.json().catch(() => null)) as {
    jobDescription?: string
    resume?: unknown
    resumeText?: string
  } | null

  if (!body?.jobDescription) return badRequest('jobDescription is required.')

  const resumeText =
    body.resumeText ??
    (isResumeSections(body.resume) ? resumeToText(body.resume) : null)
  if (!resumeText) return badRequest('resume or resumeText is required.')

  return handleAI(() =>
    calculateFitScore({ jobDescription: body.jobDescription!, resumeText }),
  )
}

/** POST /api/ai/tailor  { jobTitle, company, jobDescription, resume, strictness } */
export async function tailorRoute(req: Request): Promise<Response> {
  const denied = await guard(req)
  if (denied) return denied

  const body = (await req.json().catch(() => null)) as {
    jobTitle?: string
    company?: string
    jobDescription?: string
    resume?: unknown
    strictness?: string
  } | null

  if (!body?.jobDescription) return badRequest('jobDescription is required.')
  if (!isResumeSections(body.resume)) return badRequest('resume is required.')

  return handleAI(() =>
    generateTailoredResume({
      jobTitle: body.jobTitle ?? 'Unknown role',
      company: body.company ?? 'Unknown company',
      jobDescription: body.jobDescription!,
      resume: body.resume as ResumeSections,
      strictness: readStrictness(body.strictness),
    }),
  )
}

/** POST /api/ai/copilot  { instruction, resume, strictness, jobContext } */
export async function copilotRoute(req: Request): Promise<Response> {
  const denied = await guard(req)
  if (denied) return denied

  const body = (await req.json().catch(() => null)) as {
    instruction?: string
    resume?: unknown
    strictness?: string
    jobContext?: string | null
  } | null

  if (!body?.instruction?.trim()) return badRequest('instruction is required.')
  if (!isResumeSections(body.resume)) return badRequest('resume is required.')

  return handleAI(() =>
    handleCopilotEdit({
      instruction: body.instruction!,
      resume: body.resume as ResumeSections,
      strictness: readStrictness(body.strictness),
      jobContext: body.jobContext ?? null,
    }),
  )
}

/** POST /api/ai/structure  { text }  — PDF text into the DB shape. */
export async function structureRoute(req: Request): Promise<Response> {
  const denied = await guard(req)
  if (denied) return denied

  const body = (await req.json().catch(() => null)) as { text?: string } | null
  if (!body?.text?.trim()) return badRequest('text is required.')

  return handleAI(() => structureResume(body.text!))
}
