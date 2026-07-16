import type { ApplicationStage } from '@/types/domain'

/**
 * The DB stores snake_case enum values; the UI shows these labels.
 * Single source of truth for column order and copy — nothing else should
 * hardcode a stage string.
 */
export const STAGES: readonly ApplicationStage[] = [
  'submitted',
  'pending',
  'interview_request',
  'offer',
  'accepted',
  'rejected',
] as const

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  submitted: 'Submitted',
  pending: 'Pending',
  interview_request: 'Interview Requests',
  offer: 'Offers',
  accepted: 'Accepted',
  rejected: 'Rejected',
}

/**
 * Stages where silence means the ball is in their court — the only ones the
 * Ghosting Watchdog should ever flag. An accepted offer sitting untouched for
 * a month is not being ghosted; it's just done.
 */
export const GHOSTABLE_STAGES: readonly ApplicationStage[] = [
  'submitted',
  'pending',
  'interview_request',
] as const
