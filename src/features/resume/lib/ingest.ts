import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { ResumeInsert } from '@/types/database'
import type {
  Bullet,
  EducationEntry,
  Origin,
  TechnicalEntry,
  WorkEntry,
} from '@/types/domain'

/**
 * The upload pipeline: PDF -> raw text -> structured JSON -> a master resume row.
 *
 * Two hops, kept separate on purpose (as the endpoints are): extraction is
 * deterministic and cheap; structuring is a model call and slow. Splitting them
 * lets the UI report honest per-stage progress instead of one long opaque wait.
 */

export type IngestStage = 'extracting' | 'structuring' | 'saving' | 'done'

// ── endpoint response shapes ────────────────────────────────────────────────

interface ParseResponse {
  filename: string
  pages: number
  chars: number
  lines: string[]
  text: string
}

/** Mirrors server/schemas/resume.ts ParsedResumeSchema — drafts carry no ids. */
interface BulletDraft {
  text: string
}
interface EducationDraft {
  institution: string
  degree: string
  field_of_study: string | null
  gpa: string | null
  start_date: string | null
  end_date: string | null
  location: string | null
  coursework: string[]
  bullets: BulletDraft[]
}
interface TechnicalDraft {
  kind: 'project' | 'experience'
  title: string
  organization: string | null
  role: string | null
  start_date: string | null
  end_date: string | null
  tech_stack: string[]
  link: string | null
  bullets: BulletDraft[]
}
interface WorkDraft {
  employer: string
  role: string
  location: string | null
  start_date: string | null
  end_date: string | null
  bullets: BulletDraft[]
}
interface ParsedResume {
  full_name: string | null
  email: string | null
  phone: string | null
  location: string | null
  github_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  education: EducationDraft[]
  technical_projects_and_experience: TechnicalDraft[]
  other_work_history: WorkDraft[]
  skills_and_keywords: string[]
}

// ── draft -> domain (add the identity/visibility fields the editor needs) ────
//
// The model returns content only. The editor and the whole edit-plan engine key
// off stable ids and per-node hidden/origin flags, so we stamp them here, once,
// as the drafts cross from "model output" into "our data". Everything starts
// origin: 'user' and hidden: false — the parse is the user's resume as-is.

const uid = () => crypto.randomUUID()

function toBullets(drafts: BulletDraft[]): Bullet[] {
  return drafts.map((b) => ({ id: uid(), text: b.text, hidden: false, origin: 'user' as Origin }))
}

function toEducation(drafts: EducationDraft[]): EducationEntry[] {
  return drafts.map((d) => ({
    id: uid(),
    institution: d.institution,
    degree: d.degree,
    field_of_study: d.field_of_study,
    gpa: d.gpa,
    start_date: d.start_date,
    end_date: d.end_date,
    location: d.location,
    coursework: d.coursework ?? [],
    bullets: toBullets(d.bullets ?? []),
    hidden: false,
    origin: 'user',
  }))
}

function toTechnical(drafts: TechnicalDraft[]): TechnicalEntry[] {
  return drafts.map((d) => ({
    id: uid(),
    kind: d.kind,
    title: d.title,
    organization: d.organization,
    role: d.role,
    start_date: d.start_date,
    end_date: d.end_date,
    tech_stack: d.tech_stack ?? [],
    link: d.link,
    bullets: toBullets(d.bullets ?? []),
    hidden: false,
    origin: 'user',
  }))
}

function toWork(drafts: WorkDraft[]): WorkEntry[] {
  return drafts.map((d) => ({
    id: uid(),
    employer: d.employer,
    role: d.role,
    location: d.location,
    start_date: d.start_date,
    end_date: d.end_date,
    bullets: toBullets(d.bullets ?? []),
    hidden: false,
    origin: 'user',
  }))
}

// ── the orchestrator ────────────────────────────────────────────────────────

export interface IngestResult {
  resumeId: string
  parsedName: string | null
}

export async function ingestResume(
  file: File,
  onStage: (stage: IngestStage) => void,
): Promise<IngestResult> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('You must be signed in to upload a resume.')

  // 1. Extract text (deterministic, server-side, magic-byte checked).
  onStage('extracting')
  const form = new FormData()
  form.append('file', file)
  const parsed = await apiFetch<ParseResponse>('/api/resume/parse', {
    method: 'POST',
    body: form,
  })

  // 2. Structure with the model.
  onStage('structuring')
  const structured = await apiFetch<ParsedResume>('/api/ai/structure', {
    method: 'POST',
    body: JSON.stringify({ text: parsed.text }),
  })

  // 3. Save as the master resume.
  onStage('saving')
  const payload: ResumeInsert = {
    user_id: auth.user.id,
    version_name: 'Master Resume',
    is_master: true,
    education: toEducation(structured.education ?? []),
    technical_projects_and_experience: toTechnical(
      structured.technical_projects_and_experience ?? [],
    ),
    other_work_history: toWork(structured.other_work_history ?? []),
    skills_and_keywords: structured.skills_and_keywords ?? [],
  }

  // Exactly one master is allowed per user (partial unique index). Update the
  // existing one in place rather than tripping the constraint on a re-upload.
  const { data: existing } = await supabase
    .from('resumes')
    .select('id')
    .eq('is_master', true)
    .maybeSingle()

  let resumeId: string
  if (existing) {
    const { error } = await supabase.from('resumes').update(payload).eq('id', existing.id)
    if (error) throw new Error(error.message)
    resumeId = existing.id
  } else {
    const { data, error } = await supabase.from('resumes').insert(payload).select('id').single()
    if (error) throw new Error(error.message)
    resumeId = data.id
  }

  // 4. Opportunistically fill the profile from parsed contact info. Best-effort:
  // a failure here must not fail the upload the user actually asked for.
  const profilePatch = pruneNull({
    full_name: structured.full_name,
    email: structured.email,
    phone: structured.phone,
    location: structured.location,
    github_url: structured.github_url,
    linkedin_url: structured.linkedin_url,
    portfolio_url: structured.portfolio_url,
  })
  if (Object.keys(profilePatch).length > 0) {
    await supabase.from('profiles').update(profilePatch).eq('id', auth.user.id)
  }

  onStage('done')
  return { resumeId, parsedName: structured.full_name }
}

function pruneNull<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null)) as Partial<T>
}
