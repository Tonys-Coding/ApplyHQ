import type { JobApplicationInsert } from '@/types/database'
import type { JobPosting } from '@/types/jobs'

/**
 * A discovered posting -> a Kanban application.
 *
 * Saved jobs land in 'pending', not 'submitted': saving a lead from Discover is
 * "I intend to apply", not "I have applied". applied_at stays null for the same
 * reason — the ghost clock shouldn't start until there's actually an employer
 * who could go silent. Once the user applies, they move the card and set the
 * stage, which the trigger stamps.
 */
export function mapPostingToApplication(
  job: JobPosting,
): Omit<JobApplicationInsert, 'user_id'> {
  return {
    company_name: job.company,
    role_title: job.title,
    stage: 'pending',
    job_location: job.location ?? (job.isRemote ? 'Remote' : null),
    job_description_text: job.description || null,
    application_url: job.applyLink,
    salary_or_hourly_rate: formatSalary(job),
  }
}

function formatSalary(job: JobPosting): string | null {
  // Verified null on live results, but handle the rare case the API does
  // populate it rather than silently dropping the data.
  if (job.salaryMin == null && job.salaryMax == null) return null
  const period = job.salaryPeriod?.toLowerCase() === 'hour' ? '/hr' : '/yr'
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}${period}`
  }
  const one = job.salaryMin ?? job.salaryMax!
  return `${fmt(one)}${period}`
}
