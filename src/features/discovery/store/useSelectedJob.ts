import { create } from 'zustand'
import type { JobPosting } from '@/types/jobs'

/**
 * Holds the job opened into the detail view, plus its search siblings for the
 * "Similar roles" rail.
 *
 * Deliberately not refetched by id: JSearch has a job-details endpoint but it
 * spends quota, and we already hold the full posting from the search response.
 * The tradeoff is that a hard refresh on /discover/:id loses the selection —
 * the detail route handles that by sending the user back to the feed.
 */
interface SelectedJobState {
  selected: JobPosting | null
  siblings: JobPosting[]
  open: (job: JobPosting, siblings: JobPosting[]) => void
  clear: () => void
}

export const useSelectedJob = create<SelectedJobState>((set) => ({
  selected: null,
  siblings: [],
  open: (selected, siblings) => set({ selected, siblings }),
  clear: () => set({ selected: null, siblings: [] }),
}))
