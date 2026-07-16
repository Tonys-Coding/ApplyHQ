import type { JobApplication } from '@/types/database'
import { GHOST_THRESHOLD_DAYS } from '@/types/domain'
import { GHOSTABLE_STAGES } from './stages'

const DAY_MS = 86_400_000

export interface GhostInfo {
  isGhosted: boolean
  /** Whole days since the stage last moved. */
  idleDays: number
}

export type GhostedApplication = JobApplication & GhostInfo

/**
 * Reads stage_changed_at, NOT last_updated_at.
 *
 * This is the whole point of the two-clock design in 0001_init.sql. Ghosting
 * measures how long *they* have been silent. last_updated_at measures how
 * recently *you* touched the record — so keying off it means fixing a typo in
 * the job description resets the ghost timer on an application that has been
 * ignored for a month. The number would look fine and mean nothing.
 */
export function ghostInfo(app: JobApplication, now: number = Date.now()): GhostInfo {
  const idleDays = Math.floor((now - new Date(app.stage_changed_at).getTime()) / DAY_MS)

  return {
    idleDays,
    isGhosted:
      GHOSTABLE_STAGES.includes(app.stage) && idleDays >= GHOST_THRESHOLD_DAYS,
  }
}

/**
 * Decorates applications with { isGhosted, idleDays }.
 *
 * Derived at read time rather than stored on the object, deliberately: ghosting
 * is a function of the clock, not of the data. A persisted isGhosted boolean is
 * correct only at the instant it is written and silently rots afterwards — an
 * app sitting at 13.9 days would stay `false` through the entire session. This
 * costs one subtraction per card and is never stale.
 */
export function withGhostFlags(
  apps: JobApplication[],
  now: number = Date.now(),
): GhostedApplication[] {
  return apps.map((app) => ({ ...app, ...ghostInfo(app, now) }))
}
