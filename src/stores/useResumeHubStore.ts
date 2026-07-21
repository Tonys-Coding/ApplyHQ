import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import type { Resume, ResumeInsert } from '@/types/database'

/*
 * The resume-hub list. Duplication goes through the Bun API; deletion is
 * optimistic with the removed row returned to the caller so a toast "Undo"
 * can restore it (re-insert with the same id — RLS allows it, and any
 * job_applications.resume_id links were only set null, not lost data).
 */
interface ResumeHubState {
  resumes: Resume[]
  loading: boolean
  error: string | null

  fetchResumes: () => Promise<void>
  duplicateResume: (id: string, name?: string) => Promise<Resume | null>
  deleteResume: (id: string) => Promise<Resume | null>
  restoreResume: (row: Resume) => Promise<boolean>
}

export const useResumeHubStore = create<ResumeHubState>((set, get) => ({
  resumes: [],
  loading: false,
  error: null,

  fetchResumes: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ resumes: data ?? [], loading: false })
  },

  duplicateResume: async (id, name) => {
    try {
      const { resume } = await apiFetch<{ resume: Resume }>(`/api/resumes/${id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify(name ? { version_name: name } : {}),
      })
      set({ resumes: [resume, ...get().resumes] })
      return resume
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not duplicate resume.' })
      return null
    }
  },

  deleteResume: async (id) => {
    const removed = get().resumes.find((r) => r.id === id)
    if (!removed) return null

    set({ resumes: get().resumes.filter((r) => r.id !== id) })

    const { error } = await supabase.from('resumes').delete().eq('id', id)
    if (error) {
      set({ resumes: [removed, ...get().resumes], error: error.message })
      return null
    }
    return removed
  },

  restoreResume: async (row) => {
    set({ resumes: [row, ...get().resumes] })
    const { error } = await supabase.from('resumes').insert(row as ResumeInsert)
    if (error) {
      set({ resumes: get().resumes.filter((r) => r.id !== row.id), error: error.message })
      return false
    }
    return true
  },
}))
