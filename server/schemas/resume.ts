import { z } from 'zod'

/**
 * Two resume schemas, because there are two genuinely different jobs.
 *
 * ── 1. ParsedResumeSchema — the DB structure, authored wholesale ────────────
 * Used when turning an uploaded PDF into rows. Here the model MUST emit the
 * full Education / Technical / Work / Skills structure, because none exists
 * yet. This is the "strictly adheres to the database resume structure" schema
 * you asked for, living where that shape is actually correct.
 *
 * ── 2. ResumeEditPlanSchema — operations against an existing resume ─────────
 * Used for tailoring and copilot edits. The model returns a *list of edits*
 * referencing node ids, NOT a rewritten document.
 *
 * Why not have it re-emit the whole resume for tailoring, as specified:
 *
 *   a) Silent loss. Strict Structured Outputs forces every field to be present,
 *      so a model that "forgets" a project doesn't error — it returns a valid
 *      resume with the project gone. You'd never see it. With ops, an omitted
 *      edit is a no-op; the project simply stays.
 *   b) Silent drift. Re-emitting all 40 bullets to change 6 means 34 bullets
 *      get re-typed by a model that was not asked to touch them. Dates and
 *      metrics wobble. Your GPA becomes 3.8.
 *   c) The change log becomes guesswork — you'd have to diff two documents and
 *      infer intent. With ops, each edit already carries its own rationale.
 *   d) Cost: ~10x the output tokens per tailoring pass.
 *
 * `applyEditPlan()` turns ops back into the DB structure, so the database shape
 * is still the contract — the model just doesn't get to author it wholesale.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Parsing: PDF -> DB structure
// ─────────────────────────────────────────────────────────────────────────────

const BulletDraft = z.object({
  text: z.string().describe('The bullet verbatim from the PDF. Do not improve it.'),
})

const EducationDraft = z.object({
  institution: z.string(),
  degree: z.string(),
  field_of_study: z.string().nullable(),
  gpa: z.string().nullable().describe('Exactly as printed, e.g. "3.91". null if absent.'),
  start_date: z.string().nullable().describe('As printed, e.g. "Aug 2023".'),
  end_date: z.string().nullable().describe('As printed. "Expected May 2027" is fine.'),
  location: z.string().nullable(),
  coursework: z.array(z.string()).describe('Course names only. [] if none listed.'),
  bullets: z.array(BulletDraft),
})

const TechnicalDraft = z.object({
  kind: z.enum(['project', 'experience']).describe(
    'experience = a role at an organization. project = personal/academic work.',
  ),
  title: z.string(),
  organization: z.string().nullable(),
  role: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  tech_stack: z.array(z.string()).describe('Technologies named for THIS entry.'),
  link: z.string().nullable(),
  bullets: z.array(BulletDraft),
})

const WorkDraft = z.object({
  employer: z.string(),
  role: z.string(),
  location: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  bullets: z.array(BulletDraft),
})

export const ParsedResumeSchema = z.object({
  full_name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  github_url: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  portfolio_url: z.string().nullable(),

  education: z.array(EducationDraft),
  technical_projects_and_experience: z
    .array(TechnicalDraft)
    .describe('Software/engineering work: internships, projects, research.'),
  other_work_history: z
    .array(WorkDraft)
    .describe(
      'Non-technical employment — food service, retail, warehouse, tutoring. ' +
        'Never discard these; they are evidence of work ethic.',
    ),
  skills_and_keywords: z.array(z.string()),
})

export type ParsedResume = z.infer<typeof ParsedResumeSchema>

// ─────────────────────────────────────────────────────────────────────────────
// 2. Editing: operations against an existing resume
// ─────────────────────────────────────────────────────────────────────────────

export const ResumeSectionEnum = z.enum([
  'education',
  'technical_projects_and_experience',
  'other_work_history',
])

/**
 * A flat op with nullable fields rather than a discriminated union.
 *
 * Strict Structured Outputs requires every property in `required`, and nested
 * anyOf branches raise the model's error rate. One flat shape with explicit
 * nulls is far more reliable; applyEditPlan() validates the combinations.
 */
export const ResumeOperation = z.object({
  op: z.enum([
    'rewrite_bullet',
    'set_bullet_hidden',
    'set_entry_hidden',
    'set_skills',
  ]),
  section: ResumeSectionEnum.nullable().describe('null only for set_skills.'),
  entry_id: z.string().nullable().describe('Must be an id present in the input. Never invent one.'),
  bullet_id: z.string().nullable().describe('Required for bullet ops; null otherwise.'),
  text: z.string().nullable().describe('New bullet text. Required for rewrite_bullet.'),
  hidden: z.boolean().nullable().describe('Required for the *_hidden ops.'),
  skills: z.array(z.string()).nullable().describe('Full replacement list. Required for set_skills.'),
  rationale: z
    .string()
    .describe('One short sentence, shown verbatim in the user-facing change log.'),
})

export type ResumeOperation = z.infer<typeof ResumeOperation>

export const ResumeEditPlanSchema = z.object({
  operations: z.array(ResumeOperation),
  summary: z.string().describe('Two or three sentences on the overall strategy taken.'),
})

export type ResumeEditPlan = z.infer<typeof ResumeEditPlanSchema>
