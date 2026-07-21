import { apiFetch } from '@/lib/api'
import { supabase, RESUME_BUCKET, resumePdfPath } from '@/lib/supabase'
import { resolveFontStack } from '@/features/resume/lib/fonts'
import type { ResumeInsert } from '@/types/database'
import {
  DEFAULT_FORMAT_SETTINGS,
  type Bullet,
  type EducationEntry,
  type FormatSettings,
  type Origin,
  type TechnicalEntry,
  type WorkEntry,
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
  fontName: string
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
  headline: string | null
  contact_lines: string[]
  email: string | null
  phone: string | null
  location: string | null
  github_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  education: EducationDraft[]
  technical_projects_and_experience: TechnicalDraft[]
  other_work_history: WorkDraft[]
  /** Grouped skill lines as printed, e.g. "Languages: Python, C". */
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

  // 1. Extract text + detect the font (deterministic, server-side).
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
  //
  // version_name stays the VERSION label ("Master Resume"); the person's actual
  // name + contact live in format_settings.header, preserved from the PDF and
  // rendered as the document heading. The two were being conflated before.
  onStage('saving')

  const education = toEducation(structured.education ?? [])
  const technical = toTechnical(structured.technical_projects_and_experience ?? [])
  const otherWork = toWork(structured.other_work_history ?? [])
  const skills = repairSkillLines(structured.skills_and_keywords ?? [])
  const header = {
    full_name: structured.full_name ?? '',
    headline: structured.headline ?? null,
    contact_lines: structured.contact_lines ?? [],
  }

  const format: FormatSettings = {
    ...DEFAULT_FORMAT_SETTINGS,
    // Faithful stack: the real font name first (used if installed), then the
    // bundled metric-compatible clone, then the generic.
    font_family: resolveFontStack(parsed.fontName),
    header,
    // Snapshot the freshly-parsed resume so "Revert to original" can restore it
    // no matter how much the user or the AI later changes.
    original: {
      header,
      education,
      technical_projects_and_experience: technical,
      other_work_history: otherWork,
      skills_and_keywords: skills,
    },
  }

  const payload: ResumeInsert = {
    user_id: auth.user.id,
    version_name: 'Master Resume',
    is_master: true,
    education,
    technical_projects_and_experience: technical,
    other_work_history: otherWork,
    skills_and_keywords: skills,
    format_settings: format,
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

  // Store the pristine original PDF so the user can always re-download the exact
  // file they uploaded, no matter how much they edit. Best-effort — upsert to
  // overwrite on re-upload; a storage hiccup must not fail the whole ingest.
  try {
    const path = resumePdfPath(auth.user.id, resumeId, file.name)
    const { error: upErr } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(path, file, { upsert: true, contentType: 'application/pdf' })
    if (!upErr) {
      await supabase.from('resumes').update({ pdf_storage_path: path }).eq('id', resumeId)
    }
  } catch {
    /* original-PDF storage is a bonus, not required */
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

/**
 * Fallback repair for when the model ignores the "keep skills as grouped lines"
 * instruction and returns one skill per element. If most elements look like a
 * single skill (short, no "Category:" label), we collapse them back into one
 * comma-joined line so the display isn't a tall column of one-word rows.
 * Lines that already carry a label are left exactly as-is.
 */
function repairSkillLines(lines: string[]): string[] {
  const cleaned = lines.map((l) => l.trim()).filter(Boolean)
  if (cleaned.length <= 2) return cleaned

  const labeled = cleaned.filter((l) => /^[^:]{1,30}:/.test(l))
  const looksExploded =
    labeled.length === 0 && cleaned.every((l) => !l.includes(',') && l.length < 30)

  return looksExploded ? [cleaned.join(', ')] : cleaned
}
