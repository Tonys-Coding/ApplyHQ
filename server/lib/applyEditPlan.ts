/**
 * The edit-plan algorithm is shared with the client and lives in src/ so both
 * sides apply operations identically. This file just re-exports it for server
 * call sites.
 */
export {
  applyEditPlan,
  type ResumeSections,
  type AppliedChange,
  type ApplyResult,
} from '../../src/features/resume/lib/editPlan'
