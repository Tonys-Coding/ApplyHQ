import { zodTextFormat } from 'openai/helpers/zod'
import { openai, MODELS } from './openai'
import { applyEditPlan, type ApplyResult, type ResumeSections } from './applyEditPlan'
import {
  KeywordMatrixSchema,
  computeFitReport,
  type FitReport,
} from '../schemas/matrix'
import {
  ParsedResumeSchema,
  ResumeEditPlanSchema,
  type ParsedResume,
  type ResumeEditPlan,
} from '../schemas/resume'
import {
  COPILOT_SYSTEM,
  MATCHER_SYSTEM,
  PARSE_SYSTEM,
  TAILOR_SYSTEM,
  copilotUserPrompt,
  matcherUserPrompt,
  parseUserPrompt,
  tailorUserPrompt,
} from '../prompts'
import type { Strictness } from '../../src/types/domain'

/**
 * The three AI capabilities.
 *
 * All use responses.parse() with zodTextFormat, which sends strict JSON Schema
 * and returns a typed, validated object. A refusal or a schema violation throws
 * rather than yielding a half-parsed resume.
 */

export class AIError extends Error {}

/**
 * Sends only what the model needs to edit: ids, text, and visibility.
 *
 * Not the raw DB rows — those carry user_id and timestamps that are irrelevant
 * to the task and would just be tokens we pay for on every call.
 */
function resumeForModel(resume: ResumeSections): string {
  const strip = (entries: Array<Record<string, unknown>>) =>
    entries.map((e) => ({
      id: e.id,
      title: e.institution ?? e.title ?? e.employer,
      subtitle: e.degree ?? e.organization ?? e.role ?? null,
      hidden: e.hidden,
      tech_stack: e.tech_stack ?? undefined,
      bullets: (e.bullets as Array<Record<string, unknown>>).map((b) => ({
        id: b.id,
        text: b.text,
        hidden: b.hidden,
      })),
    }))

  return JSON.stringify(
    {
      education: strip(resume.education as unknown as Array<Record<string, unknown>>),
      technical_projects_and_experience: strip(
        resume.technical_projects_and_experience as unknown as Array<Record<string, unknown>>,
      ),
      other_work_history: strip(
        resume.other_work_history as unknown as Array<Record<string, unknown>>,
      ),
      skills_and_keywords: resume.skills_and_keywords,
    },
    null,
    1,
  )
}

/** Flattens a resume to plain text for keyword matching. */
export function resumeToText(resume: ResumeSections): string {
  const lines: string[] = []
  const section = (name: string, entries: Array<Record<string, unknown>>) => {
    if (!entries.length) return
    lines.push(`\n${name.toUpperCase()}`)
    for (const e of entries) {
      if (e.hidden) continue
      lines.push(
        [e.institution ?? e.title ?? e.employer, e.degree ?? e.organization ?? e.role]
          .filter(Boolean)
          .join(' — '),
      )
      if (Array.isArray(e.coursework) && e.coursework.length)
        lines.push(`Coursework: ${e.coursework.join(', ')}`)
      if (Array.isArray(e.tech_stack) && e.tech_stack.length)
        lines.push(`Tech: ${e.tech_stack.join(', ')}`)
      for (const b of e.bullets as Array<Record<string, unknown>>) {
        if (!b.hidden) lines.push(`• ${b.text}`)
      }
    }
  }

  section('education', resume.education as unknown as Array<Record<string, unknown>>)
  section(
    'technical projects and experience',
    resume.technical_projects_and_experience as unknown as Array<Record<string, unknown>>,
  )
  section(
    'work history',
    resume.other_work_history as unknown as Array<Record<string, unknown>>,
  )
  lines.push(`\nSKILLS\n${resume.skills_and_keywords.join(', ')}`)
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────

/** The Matcher — Keyword Matrix + deterministic Fit Score. */
export async function calculateFitScore(args: {
  jobDescription: string
  resumeText: string
}): Promise<FitReport> {
  const res = await openai.responses.parse({
    model: MODELS.fast,
    instructions: MATCHER_SYSTEM,
    input: matcherUserPrompt(args.jobDescription, args.resumeText),
    text: { format: zodTextFormat(KeywordMatrixSchema, 'keyword_matrix') },
  })

  const matrix = res.output_parsed
  if (!matrix) throw new AIError('Model returned no parsed keyword matrix.')

  // The score is ours, not the model's.
  return computeFitReport(matrix)
}

/** The Tailoring Engine. */
export async function generateTailoredResume(args: {
  jobTitle: string
  company: string
  jobDescription: string
  resume: ResumeSections
  strictness: Strictness
}): Promise<{ plan: ResumeEditPlan; result: ApplyResult }> {
  const res = await openai.responses.parse({
    model: MODELS.tailor,
    instructions: TAILOR_SYSTEM,
    input: tailorUserPrompt({
      jobTitle: args.jobTitle,
      company: args.company,
      jobDescription: args.jobDescription,
      resumeJson: resumeForModel(args.resume),
      strictness: args.strictness,
    }),
    text: { format: zodTextFormat(ResumeEditPlanSchema, 'resume_edit_plan') },
  })

  const plan = res.output_parsed
  if (!plan) throw new AIError('Model returned no parsed edit plan.')

  return { plan, result: applyEditPlan(args.resume, plan) }
}

/** The Copilot — a single user instruction against the current resume. */
export async function handleCopilotEdit(args: {
  instruction: string
  resume: ResumeSections
  strictness: Strictness
  jobContext: string | null
}): Promise<{ plan: ResumeEditPlan; result: ApplyResult }> {
  const res = await openai.responses.parse({
    model: MODELS.tailor,
    instructions: COPILOT_SYSTEM,
    input: copilotUserPrompt({
      instruction: args.instruction,
      resumeJson: resumeForModel(args.resume),
      strictness: args.strictness,
      jobContext: args.jobContext,
    }),
    text: { format: zodTextFormat(ResumeEditPlanSchema, 'resume_edit_plan') },
  })

  const plan = res.output_parsed
  if (!plan) throw new AIError('Model returned no parsed edit plan.')

  return { plan, result: applyEditPlan(args.resume, plan) }
}

/** PDF text -> DB structure. The one place the model authors the whole shape. */
export async function structureResume(resumeText: string): Promise<ParsedResume> {
  const res = await openai.responses.parse({
    model: MODELS.tailor,
    instructions: PARSE_SYSTEM,
    input: parseUserPrompt(resumeText),
    text: { format: zodTextFormat(ParsedResumeSchema, 'parsed_resume') },
  })

  const parsed = res.output_parsed
  if (!parsed) throw new AIError('Model returned no parsed resume.')
  return parsed
}
