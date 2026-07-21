import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Clock,
  BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import type { JobPosting } from '@/types/jobs'
import { TERM_LABELS } from '@/features/discovery/lib/termPresets'
import { mapPostingToApplication } from '@/features/discovery/lib/mapToApplication'
import { useSelectedJob } from '@/features/discovery/store/useSelectedJob'
import { useJobStore } from '@/stores/useJobStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CompanyLogo } from '@/components/CompanyLogo'

export function JobCard({
  job,
  saved,
  siblings,
}: {
  job: JobPosting
  saved: boolean
  siblings: JobPosting[]
}) {
  const createApplication = useJobStore((s) => s.createApplication)
  const openJob = useSelectedJob((s) => s.open)
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  function openDetail() {
    openJob(job, siblings)
    navigate(`/discover/${job.id}`)
  }

  const hasTerms = job.terms.length > 0

  async function onSave() {
    setSaving(true)
    try {
      await createApplication(mapPostingToApplication(job))
      // Read the store error rather than assuming success — createApplication
      // swallows failures into state, so a bare toast.success would lie.
      const err = useJobStore.getState().error
      if (err) toast.error('Could not save to tracker', { description: err })
      else
        toast.success('Saved to tracker', {
          description: `${job.title} — added to Pending`,
        })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      className={cn(
        'glass-panel group relative flex flex-col gap-4 p-5 transition-colors',
        // A posting that names the target cycle gets a coral edge — this is the
        // "highlight matching timelines" cue, done with a border so it reads at
        // a glance without shouting.
        hasTerms && 'border-coral/40',
      )}
    >
      {hasTerms && (
        <div className="absolute -top-px left-6 h-px w-24 bg-coral blur-[2px]" aria-hidden />
      )}

      <div className="flex items-start gap-4">
        <CompanyLogo src={job.companyLogo} name={job.company} className="size-12 text-sm" />

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={openDetail}
            className="font-heading block max-w-full truncate text-left text-base font-semibold leading-snug transition-colors hover:text-primary"
          >
            {job.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" />
              {job.company}
            </span>
            {(job.location || job.isRemote) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {job.location ?? 'Remote'}
              </span>
            )}
            {job.postedAtLabel && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {job.postedAtLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {job.snippet && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{job.snippet}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {job.terms.map((t) => (
          <Badge
            key={t}
            className="border-coral/30 bg-coral/15 text-coral-foreground hover:bg-coral/15"
          >
            <BadgeCheck className="size-3" />
            {TERM_LABELS[t]}
          </Badge>
        ))}
        {job.employmentType && (
          <Badge variant="secondary" className="font-normal">
            {job.employmentType}
          </Badge>
        )}
        {job.publisher && (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            via {job.publisher}
          </Badge>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button
          variant={saved ? 'secondary' : 'default'}
          size="sm"
          className="flex-1"
          disabled={saved || saving}
          onClick={onSave}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {saved ? 'Saved to tracker' : 'Save to tracker'}
        </Button>

        <Button variant="outline" size="sm" onClick={openDetail}>
          Details
        </Button>

        <Button asChild variant="ghost" size="sm">
          <a href={job.applyLink} target="_blank" rel="noopener noreferrer" aria-label="Open application link">
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
    </Card>
  )
}
