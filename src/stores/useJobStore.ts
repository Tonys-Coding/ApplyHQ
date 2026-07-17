import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type {
  JobApplication,
  JobApplicationInsert,
  JobApplicationUpdate,
} from '@/types/database'
import type { ApplicationStage } from '@/types/domain'
import { withGhostFlags, type GhostedApplication } from '@/features/kanban/lib/ghosting'

interface JobState {
  applications: JobApplication[]
  loading: boolean
  error: string | null

  fetchApplications: () => Promise<void>
  createApplication: (input: Omit<JobApplicationInsert, 'user_id'>) => Promise<void>
  updateApplicationStage: (id: string, nextStage: ApplicationStage) => Promise<void>
  moveCard: (id: string, nextStage: ApplicationStage, toIndex: number) => Promise<void>
  /**
   * `JobApplicationUpdate` (not Partial<JobApplication>) so the trigger-owned
   * columns are unrepresentable here: sending last_updated_at or
   * stage_changed_at from the client would be silently overwritten by the DB
   * trigger anyway, and believing otherwise is how the ghost clock drifts.
   */
  updateApplication: (id: string, patch: JobApplicationUpdate) => Promise<void>
  deleteApplication: (id: string) => Promise<void>
  reset: () => void
}

export const useJobStore = create<JobState>((set, get) => ({
  applications: [],
  loading: false,
  error: null,

  fetchApplications: async () => {
    set({ loading: true, error: null })

    // No .eq('user_id', ...) needed — RLS scopes this to the caller. Adding it
    // would be redundant, and worse, would imply the filter is what's securing
    // the data. It isn't; the policy is.
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .order('board_position', { ascending: true })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ applications: data ?? [], loading: false })
  },

  createApplication: async (input) => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      set({ error: 'Not signed in.' })
      return
    }

    const { data, error } = await supabase
      .from('job_applications')
      .insert({ ...input, user_id: auth.user.id })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return
    }
    set({ applications: [...get().applications, data] })
  },

  /**
   * Optimistic stage change.
   *
   * The card must move the instant it's dropped — waiting on a round trip makes
   * the board feel broken. So we write locally first, then reconcile.
   */
  updateApplicationStage: async (id, nextStage) => {
    const before = get().applications.find((a) => a.id === id)
    if (!before || before.stage === nextStage) return

    // Mirror what the DB trigger will do, so the ghost badge clears immediately
    // rather than after the refetch.
    const optimisticNow = new Date().toISOString()
    set({
      applications: get().applications.map((a) =>
        a.id === id
          ? { ...a, stage: nextStage, stage_changed_at: optimisticNow, last_updated_at: optimisticNow }
          : a,
      ),
    })

    const { data, error } = await supabase
      .from('job_applications')
      .update({ stage: nextStage })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // Roll back ONLY this row, by id — not a wholesale restore of the previous
      // array. A snapshot restore would silently erase any other card the user
      // dragged while this request was in flight.
      set({
        applications: get().applications.map((a) => (a.id === id ? before : a)),
        error: `Could not move card: ${error.message}`,
      })
      return
    }

    // Adopt the server row: stage_changed_at / last_updated_at are trigger-owned,
    // and the server clock is the one the ghost math must agree with.
    set({
      applications: get().applications.map((a) => (a.id === id ? data : a)),
      error: null,
    })
  },

  /**
   * Drag-and-drop move: stage + position within the column.
   *
   * board_position is double precision so an insert between two cards is just
   * their midpoint — no renumbering the column, no write amplification. Dropping
   * at the ends brackets against the neighbour.
   */
  moveCard: async (id, nextStage, toIndex) => {
    const apps = get().applications
    const before = apps.find((a) => a.id === id)
    if (!before) return

    const column = apps
      .filter((a) => a.stage === nextStage && a.id !== id)
      .sort((a, b) => a.board_position - b.board_position)

    const prev = column[toIndex - 1]
    const next = column[toIndex]

    let position: number
    if (!prev && !next) position = Date.now()
    else if (!prev) position = next.board_position - 1
    else if (!next) position = prev.board_position + 1
    else position = (prev.board_position + next.board_position) / 2

    const optimisticNow = new Date().toISOString()
    set({
      applications: apps.map((a) =>
        a.id === id
          ? {
              ...a,
              stage: nextStage,
              board_position: position,
              last_updated_at: optimisticNow,
              // Only reset the ghost clock if the stage actually changed —
              // matches the DB trigger. Reordering within a column is not
              // contact from the employer.
              stage_changed_at:
                a.stage === nextStage ? a.stage_changed_at : optimisticNow,
            }
          : a,
      ),
    })

    const { data, error } = await supabase
      .from('job_applications')
      .update({ stage: nextStage, board_position: position })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({
        applications: get().applications.map((a) => (a.id === id ? before : a)),
        error: `Could not move card: ${error.message}`,
      })
      return
    }
    set({
      applications: get().applications.map((a) => (a.id === id ? data : a)),
      error: null,
    })
  },

  updateApplication: async (id, patch) => {
    const before = get().applications.find((a) => a.id === id)
    if (!before) return

    set({
      applications: get().applications.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })

    const { data, error } = await supabase
      .from('job_applications')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({
        applications: get().applications.map((a) => (a.id === id ? before : a)),
        error: error.message,
      })
      return
    }
    set({ applications: get().applications.map((a) => (a.id === id ? data : a)) })
  },

  deleteApplication: async (id) => {
    const before = get().applications
    set({ applications: before.filter((a) => a.id !== id) })

    const { error } = await supabase.from('job_applications').delete().eq('id', id)
    if (error) {
      set({ applications: before, error: error.message })
    }
  },

  reset: () => set({ applications: [], loading: false, error: null }),
}))

/**
 * Applications for one Kanban column, ghost-flagged and ordered.
 *
 * `now` is a parameter rather than an internal Date.now() so the ghost boundary
 * is testable without mocking the global clock.
 */
export function selectColumn(
  apps: JobApplication[],
  stage: ApplicationStage,
  now: number = Date.now(),
): GhostedApplication[] {
  return withGhostFlags(
    apps.filter((a) => a.stage === stage).sort((a, b) => a.board_position - b.board_position),
    now,
  )
}

export function selectGhostedCount(apps: JobApplication[], now: number = Date.now()): number {
  return withGhostFlags(apps, now).filter((a) => a.isGhosted).length
}

/**
 * Apply links already on the board.
 *
 * The Discover feed uses this to show a job as "Saved" and block a second copy.
 * We dedupe on application_url because job_applications has no external-id
 * column — the apply link is the only stable identity a JSearch posting carries
 * across into the tracker.
 */
export function selectSavedApplyLinks(apps: JobApplication[]): Set<string> {
  return new Set(apps.map((a) => a.application_url).filter((u): u is string => !!u))
}
