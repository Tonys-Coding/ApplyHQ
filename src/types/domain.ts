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

/** Editor top-bar state. font_size in pt, margin in inches. */
export interface FormatSettings {
  font_size: number
  line_height: number
  margin: number
}

export const DEFAULT_FORMAT_SETTINGS: FormatSettings = {
  font_size: 10.5,
  line_height: 1.15,
  margin: 0.5,
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
