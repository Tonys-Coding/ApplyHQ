/**
 * Canonical shapes for everything stored as JSONB.
 *
 * Postgres will not enforce these (a jsonb column accepts any valid JSON), so
 * this file is the contract in two places:
 *   1. the editor + copilot read/write against these types
 *   2. the OpenAI Structured Outputs JSON Schema is derived from them, which is
 *      what actually keeps the model from inventing fields
 */

/** Who authored a node. Drives the copilot's change log and the diff view. */
export type Origin = 'user' | 'ai'

/**
 * The atomic unit of a resume.
 *
 * `hidden` rather than deletion is the core invariant of the whole editor:
 * tailoring never destroys content, it only toggles visibility. That is what
 * makes "Fit to One Page" reversible and what the quick-action cards flip.
 */
export interface Bullet {
  id: string
  text: string
  hidden: boolean
  origin: Origin
}

export interface EducationEntry {
  id: string
  institution: string
  degree: string
  field_of_study: string | null
  gpa: string | null
  start_date: string | null
  end_date: string | null
  location: string | null
  coursework: string[]
  bullets: Bullet[]
  hidden: boolean
  origin: Origin
}

export interface TechnicalEntry {
  id: string
  kind: 'project' | 'experience'
  title: string
  organization: string | null
  role: string | null
  start_date: string | null
  end_date: string | null
  tech_stack: string[]
  link: string | null
  bullets: Bullet[]
  hidden: boolean
  origin: Origin
}

export interface WorkEntry {
  id: string
  employer: string
  role: string
  location: string | null
  start_date: string | null
  end_date: string | null
  bullets: Bullet[]
  hidden: boolean
  origin: Origin
}

/**
 * The resume's header block — name + contact — preserved from the PDF exactly
 * as printed, and fully editable. Lives on the document, NOT swapped for the
 * version label.
 */
export interface ResumeHeader {
  full_name: string
  headline: string | null
  /** Contact lines verbatim, one per printed line. */
  contact_lines: string[]
}

/**
 * A frozen copy of the resume as first parsed — restored by "Revert to original".
 * Header lives here too so a revert also restores name/contact edits.
 */
export interface ResumeSnapshot {
  header: ResumeHeader
  education: EducationEntry[]
  technical_projects_and_experience: TechnicalEntry[]
  other_work_history: WorkEntry[]
  skills_and_keywords: string[]
}

/**
 * Document presentation + preserved meta, persisted in the resumes.format_settings
 * JSONB column. Beyond the editor's font/margin controls it also carries the
 * retained font family, the header, and the original-parse snapshot, so all
 * survive round-trips without a schema change.
 */
export interface FormatSettings {
  font_size: number
  line_height: number
  margin: number
  /** CSS font stack matching the uploaded PDF (serif vs sans). */
  font_family: string
  header: ResumeHeader
  /** The freshly-parsed resume, for Revert to original. Absent on old rows. */
  original?: ResumeSnapshot
}

/** The three font stacks for the toolbar override — bundled metric-clone fonts. */
export const FONT_STACKS = {
  serif: '"Tinos", "Times New Roman", Times, serif',
  sans: '"Arimo", Arial, Helvetica, sans-serif',
  mono: '"Cousine", "Courier New", monospace',
} as const

export type FontChoice = keyof typeof FONT_STACKS

export const DEFAULT_FONT_FAMILY = FONT_STACKS.serif

/** Best-effort reverse lookup: which choice does a stored stack correspond to. */
export function fontChoiceOf(stack: string): FontChoice {
  if (/mono|courier|cousine/i.test(stack)) return 'mono'
  if (/arimo|carlito|helvet|arial|calibri|sans/i.test(stack)) return 'sans'
  return 'serif'
}

export const DEFAULT_FORMAT_SETTINGS: FormatSettings = {
  font_size: 10.5,
  line_height: 1.15,
  margin: 0.5,
  font_family: DEFAULT_FONT_FAMILY,
  header: { full_name: '', headline: null, contact_lines: [] },
}

/** Mirrors the public.application_stage enum, in board order. */
export type ApplicationStage =
  | 'submitted'
  | 'pending'
  | 'interview_request'
  | 'offer'
  | 'accepted'
  | 'rejected'

/** Days without a stage change before the Ghosting Watchdog flags a card. */
export const GHOST_THRESHOLD_DAYS = 14

/**
 * How much licence the copilot has when rewriting.
 *
 * `strict` is the safety rail that makes this tool usable for real applications:
 * it may only reorder, hide, and reword existing content. It may not invent a
 * skill, a metric, or a date. Fabrication on a resume is not a style choice.
 */
export type Strictness = 'strict' | 'balanced' | 'creative'

export const STRICTNESS_LABELS: Record<Strictness, string> = {
  strict: 'Strict — reword only, never invent',
  balanced: 'Balanced — may infer implied skills',
  creative: 'Creative — may suggest new phrasing',
}

/** One entry in the copilot's change log. */
export interface ChangeLogEntry {
  id: string
  timestamp: string
  kind: 'ai_edit' | 'visibility' | 'format' | 'user_edit'
  summary: string
  /** id of the Bullet or section entry this touched, when applicable. */
  node_id?: string
  before?: string
  after?: string
}

/** Any resume node that can be hidden — the shared shape the editor walks. */
export type ResumeNode = EducationEntry | TechnicalEntry | WorkEntry

/** Which array of the resumes table a node came from. */
export type ResumeSectionKey =
  | 'education'
  | 'technical_projects_and_experience'
  | 'other_work_history'

export const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  education: 'Education',
  technical_projects_and_experience: 'Technical Projects & Experience',
  other_work_history: 'Work History',
}

/** Display title for a node, whichever section shape it has. */
export function nodeTitle(node: ResumeNode): string {
  if ('institution' in node) return node.institution
  if ('title' in node) return node.title
  return node.employer
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit-plan contract
//
// Plain-TS mirror of server/schemas/resume.ts's zod ResumeOperation. Defined
// here, in the shared module, so BOTH the client applyEditPlan and the server
// zod schema reference one shape — the algorithm runs identically on either
// side (the client applies what the model returns; the server validates it).
// ─────────────────────────────────────────────────────────────────────────────

export type ResumeOpKind =
  | 'rewrite_bullet'
  | 'set_bullet_hidden'
  | 'set_entry_hidden'
  | 'set_skills'
  | 'set_entry_kind'
  | 'move_entry'

export interface ResumeOperation {
  op: ResumeOpKind
  section: ResumeSectionKey | null
  entry_id: string | null
  bullet_id: string | null
  text: string | null
  hidden: boolean | null
  skills: string[] | null
  /** Target section for move_entry. */
  to_section: ResumeSectionKey | null
  /** Experience vs project, for set_entry_kind (and move into technical). */
  entry_kind: 'experience' | 'project' | null
  /** One sentence, shown verbatim in the change log. */
  rationale: string
}

export interface ResumeEditPlan {
  operations: ResumeOperation[]
  summary: string
}
