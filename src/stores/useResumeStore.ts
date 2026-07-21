import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Resume } from '@/types/database'
import {
  DEFAULT_FORMAT_SETTINGS,
  type Bullet,
  type ChangeLogEntry,
  type FormatSettings,
  type ResumeEditPlan,
  type ResumeHeader,
  type ResumeSectionKey,
  type Strictness,
} from '@/types/domain'
import {
  applyEditPlan,
  type ApplyResult,
  type ResumeSections,
} from '@/features/resume/lib/editPlan'

interface ResumeState {
  resume: Resume | null
  loading: boolean
  error: string | null

  format: FormatSettings
  changeLog: ChangeLogEntry[]
  strictness: Strictness
  /** Set when tailoring against a specific job; null on the master resume. */
  targetApplicationId: string | null
  /** The target job's description text — passed to the copilot as context. */
  jobContext: string | null

  loadResume: (id: string) => Promise<void>
  loadMaster: () => Promise<void>
  setFormat: (patch: Partial<FormatSettings>) => void
  setStrictness: (s: Strictness) => void
  setTargetApplication: (id: string | null, jobContext?: string | null) => void

  toggleNode: (section: ResumeSectionKey, nodeId: string) => void
  toggleBullet: (section: ResumeSectionKey, nodeId: string, bulletId: string) => void
  editBullet: (section: ResumeSectionKey, nodeId: string, bulletId: string, text: string) => void

  /** Edit the preserved header (name / headline / contact lines). */
  updateHeader: (patch: Partial<ResumeHeader>) => void
  /** Merge a partial into a section entry — any scalar or list field. */
  updateEntry: (
    section: ResumeSectionKey,
    nodeId: string,
    patch: Record<string, unknown>,
  ) => void
  /** Replace the grouped skill lines. */
  updateSkills: (lines: string[]) => void
  /** Append a new empty, user-authored bullet to an entry. */
  addBullet: (section: ResumeSectionKey, nodeId: string) => void

  /** Current resume as the bare sections the edit-plan engine needs. */
  sections: () => ResumeSections | null
  /** Apply a model edit plan to live state, logging every change. */
  applyPlan: (plan: ResumeEditPlan) => ApplyResult | null

  logChange: (entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>) => void
  clearLog: () => void
  save: () => Promise<void>
  reset: () => void
}

const nowIso = () => new Date().toISOString()

/**
 * Fills in any fields a stored format_settings predates (font_family, header),
 * so resumes saved before this shape existed still load with a valid header and
 * font instead of undefined.
 */
function mergeFormat(stored: Partial<FormatSettings> | null | undefined): FormatSettings {
  return {
    ...DEFAULT_FORMAT_SETTINGS,
    ...stored,
    header: { ...DEFAULT_FORMAT_SETTINGS.header, ...stored?.header },
  }
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resume: null,
  loading: false,
  error: null,
  format: DEFAULT_FORMAT_SETTINGS,
  changeLog: [],
  strictness: 'strict',
  targetApplicationId: null,
  jobContext: null,

  loadResume: async (id) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.from('resumes').select('*').eq('id', id).single()
    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ resume: data, format: mergeFormat(data.format_settings), loading: false })
  },

  loadMaster: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('is_master', true)
      .maybeSingle()

    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({
      resume: data,
      format: mergeFormat(data?.format_settings),
      loading: false,
    })
  },

  setFormat: (patch) => set({ format: { ...get().format, ...patch } }),
  setStrictness: (strictness) => set({ strictness }),
  setTargetApplication: (targetApplicationId, jobContext = null) =>
    set({ targetApplicationId, jobContext }),

  sections: () => {
    const r = get().resume
    if (!r) return null
    return {
      education: r.education,
      technical_projects_and_experience: r.technical_projects_and_experience,
      other_work_history: r.other_work_history,
      skills_and_keywords: r.skills_and_keywords,
    }
  },

  /**
   * Applies a model edit plan to the LIVE store state.
   *
   * The client runs the same applyEditPlan the server does, against whatever the
   * canvas currently shows, so re-render touches exactly the edited nodes and
   * leaves everything else referentially unchanged. Every applied op becomes a
   * change-log entry; rejected ops (hallucinated ids) are returned for the
   * caller to surface rather than silently dropped.
   */
  applyPlan: (plan) => {
    const resume = get().resume
    const current = get().sections()
    if (!resume || !current) return null

    const result = applyEditPlan(current, plan)

    set({
      resume: {
        ...resume,
        education: result.resume.education,
        technical_projects_and_experience: result.resume.technical_projects_and_experience,
        other_work_history: result.resume.other_work_history,
        skills_and_keywords: result.resume.skills_and_keywords,
      },
    })

    for (const change of result.applied) {
      get().logChange({
        kind: 'ai_edit',
        node_id: change.bullet_id ?? change.entry_id ?? undefined,
        summary: change.rationale,
        before: change.before ?? undefined,
        after: change.after ?? undefined,
      })
    }

    return result
  },

  /**
   * Visibility toggles mutate in place and never delete.
   *
   * That invariant is what makes tailoring safe to experiment with: every
   * "remove this project" is really a hide, so it's one click back. It's also
   * what the quick-action cards flip, and what Fit to One Page spends.
   */
  toggleNode: (section, nodeId) => {
    const resume = get().resume
    if (!resume) return

    const nodes = resume[section] as Array<{ id: string; hidden: boolean }>
    const target = nodes.find((n) => n.id === nodeId)
    if (!target) return

    set({
      resume: {
        ...resume,
        [section]: nodes.map((n) => (n.id === nodeId ? { ...n, hidden: !n.hidden } : n)),
      },
    })
    get().logChange({
      kind: 'visibility',
      node_id: nodeId,
      summary: `${target.hidden ? 'Showed' : 'Hid'} a ${section} entry`,
    })
  },

  toggleBullet: (section, nodeId, bulletId) => {
    const resume = get().resume
    if (!resume) return

    const nodes = resume[section] as Array<{ id: string; bullets: Bullet[] }>
    set({
      resume: {
        ...resume,
        [section]: nodes.map((n) =>
          n.id !== nodeId
            ? n
            : {
                ...n,
                bullets: n.bullets.map((b) =>
                  b.id === bulletId ? { ...b, hidden: !b.hidden } : b,
                ),
              },
        ),
      },
    })
    get().logChange({ kind: 'visibility', node_id: bulletId, summary: 'Toggled a bullet' })
  },

  editBullet: (section, nodeId, bulletId, text) => {
    const resume = get().resume
    if (!resume) return

    const nodes = resume[section] as Array<{ id: string; bullets: Bullet[] }>
    const before = nodes.find((n) => n.id === nodeId)?.bullets.find((b) => b.id === bulletId)
    if (!before || before.text === text) return

    set({
      resume: {
        ...resume,
        [section]: nodes.map((n) =>
          n.id !== nodeId
            ? n
            : {
                ...n,
                bullets: n.bullets.map((b) =>
                  // A human edit reclaims authorship: origin flips back to 'user'
                  // so the change log stops crediting the model for your words.
                  b.id === bulletId ? { ...b, text, origin: 'user' as const } : b,
                ),
              },
        ),
      },
    })
    get().logChange({
      kind: 'user_edit',
      node_id: bulletId,
      summary: 'Edited a bullet',
      before: before.text,
      after: text,
    })
  },

  updateHeader: (patch) => {
    const format = get().format
    set({ format: { ...format, header: { ...format.header, ...patch } } })
  },

  updateEntry: (section, nodeId, patch) => {
    const resume = get().resume
    if (!resume) return
    const nodes = resume[section] as Array<{ id: string }>
    set({
      resume: {
        ...resume,
        [section]: nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
      },
    })
  },

  updateSkills: (lines) => {
    const resume = get().resume
    if (!resume) return
    set({ resume: { ...resume, skills_and_keywords: lines } })
  },

  addBullet: (section, nodeId) => {
    const resume = get().resume
    if (!resume) return
    const nodes = resume[section] as Array<{ id: string; bullets: Bullet[] }>
    const fresh: Bullet = { id: crypto.randomUUID(), text: '', hidden: false, origin: 'user' }
    set({
      resume: {
        ...resume,
        [section]: nodes.map((n) =>
          n.id === nodeId ? { ...n, bullets: [...n.bullets, fresh] } : n,
        ),
      },
    })
  },

  logChange: (entry) =>
    set({
      changeLog: [
        { ...entry, id: crypto.randomUUID(), timestamp: nowIso() },
        ...get().changeLog,
      ].slice(0, 200),
    }),

  clearLog: () => set({ changeLog: [] }),

  save: async () => {
    const { resume, format } = get()
    if (!resume) return

    const { error } = await supabase
      .from('resumes')
      .update({
        education: resume.education,
        technical_projects_and_experience: resume.technical_projects_and_experience,
        other_work_history: resume.other_work_history,
        skills_and_keywords: resume.skills_and_keywords,
        format_settings: format,
      })
      .eq('id', resume.id)

    if (error) set({ error: error.message })
  },

  reset: () =>
    set({
      resume: null,
      loading: false,
      error: null,
      format: DEFAULT_FORMAT_SETTINGS,
      changeLog: [],
      targetApplicationId: null,
      jobContext: null,
    }),
}))
