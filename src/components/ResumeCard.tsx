import { useNavigate } from 'react-router-dom'
import { FileText, Star } from 'lucide-react'
import type { Resume } from '@/types/database'
import { ResumePreview } from '@/features/resume/components/ResumePreview'
import { ResumeCardMenu } from '@/components/ResumeCardMenu'
import { relativeTime } from '@/lib/time'
import { cn } from '@/lib/utils'

function fitBadgeClass(score: number): string {
  if (score >= 75) return 'border-success/40 bg-success/15 text-success'
  if (score >= 50) return 'border-warning/40 bg-warning/15 text-warning'
  return 'border-primary/40 bg-primary/15 text-primary'
}

export function ResumeCard({ resume }: { resume: Resume }) {
  const navigate = useNavigate()

  const hasContent =
    resume.education.length > 0 ||
    resume.technical_projects_and_experience.length > 0 ||
    resume.other_work_history.length > 0 ||
    !!resume.format_settings?.header?.full_name

  const fitScore = resume.format_settings?.last_fit_score

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/workspace/${resume.id}`)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/workspace/${resume.id}`)}
      className={cn(
        'group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/5 bg-card',
        'text-left transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-indigo',
      )}
    >
      <div className="relative border-b border-white/5 bg-secondary/40">
        {hasContent ? (
          <ResumePreview resume={resume} />
        ) : (
          <div
            className="grid w-full place-items-center text-muted-foreground"
            style={{ aspectRatio: '8.5 / 11' }}
          >
            <div className="flex flex-col items-center gap-2 text-xs">
              <FileText className="size-8" />
              Open resume to edit
            </div>
          </div>
        )}

        {resume.is_master && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-indigo/40 bg-indigo/20 px-2 py-0.5 text-[10px] font-medium text-indigo-light">
            <Star className="size-2.5" />
            Master
          </span>
        )}
        {typeof fitScore === 'number' && (
          <span
            className={cn(
              'absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums',
              fitBadgeClass(fitScore),
            )}
          >
            {fitScore}% fit
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 p-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{resume.version_name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Edited {relativeTime(resume.updated_at)}
          </div>
        </div>
        <ResumeCardMenu resume={resume} />
      </div>
    </div>
  )
}
