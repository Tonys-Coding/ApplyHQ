import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Resume } from '@/types/database'
import {
  DEFAULT_FORMAT_SETTINGS,
  type Bullet,
  type ChangeLogEntry,
  type FormatSettings,
  type ResumeSectionKey,
  type Strictness,
} from '@/types/domain'

interface ResumeState {
  resume: Resume | null
  loading: boolean
  error: string | null

  format: FormatSettings
  changeLog: ChangeLogEntry[]
  strictness: Strictness
  /** Set when tailoring against a specific job; null on the master resume. */
  targetApplicationId: string | null

  loadResume: (id: string) => Promise<void>
  loadMaster: () => Promise<void>
  setFormat: (patch: Partial<FormatSettings>) => void
  setStrictness: (s: Strictness) => void
  setTargetApplication: (id: string | null) => void

  toggleNode: (section: ResumeSectionKey, nodeId: string) => void
  toggleBullet: (section: ResumeSectionKey, nodeId: string, bulletId: string) => void
  editBullet: (section: ResumeSectionKey, nodeId: string, bulletId: string, text: string) => void

  logChange: (entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>) => void
  clearLog: () => void
  save: () => Promise<void>
  reset: () => void
}

const nowIso = () => new Date().toISOString()

export const useResumeStore = create<ResumeState>((set, get) => ({
  resume: null,
  loading: false,
  error: null,
  format: DEFAULT_FORMAT_SETTINGS,
  changeLog: [],
  strictness: 'strict',
  targetApplicationId: null,

  loadResume: async (id) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.from('resumes').select('*').eq('id', id).single()
    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ resume: data, format: data.format_settings ?? DEFAULT_FORMAT_SETTINGS, loading: false })
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
      format: data?.format_settings ?? DEFAULT_FORMAT_SETTINGS,
      loading: false,
    })
  },

  setFormat: (patch) => set({ format: { ...get().format, ...patch } }),
  setStrictness: (strictness) => set({ strictness }),
  setTargetApplication: (targetApplicationId) => set({ targetApplicationId }),

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
    }),
}))
