import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  Check,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSelectedJob } from '@/features/discovery/store/useSelectedJob'
import { TERM_LABELS } from '@/features/discovery/lib/termPresets'
import { mapPostingToApplication } from '@/features/discovery/lib/mapToApplication'
import { useJobStore, selectSavedApplyLinks } from '@/stores/useJobStore'
import type { JobPosting } from '@/types/jobs'
import { cn } from '@/lib/utils'

/**
 * Per-job detail page, matching the TalentPulse job-detail reference:
 * breadcrumb + title header with a brand-red accent rule, glass-panel body with
 * brand-red section markers, and a sticky apply card + similar-roles rail.
 */
export function JobDetail() {
  const selected = useSelectedJob((s) => s.selected)
  const siblings = useSelectedJob((s) => s.siblings)

  if (!selected) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div className="flex max-w-sm flex-col items-center gap-3">
          <Compass className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No job selected. Open a role from Discover to see its full posting.
          </p>
          <Link
            to="/discover"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Back to Discover
          </Link>
        </div>
      </div>
    )
  }

  const similar = siblings.filter((j) => j.id !== selected.id).slice(0, 4)

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 md:flex-row md:px-8">
        {/* Left — details */}
        <div className="flex flex-1 flex-col gap-8">
          <Header job={selected} />

          <div className="glass-panel flex flex-col gap-6 rounded-xl p-6">
            <Section title="About the Role">
              <DescriptionBody text={selected.description} />
            </Section>
          </div>
        </div>

        {/* Right — sticky apply + similar */}
        <div className="flex flex-col gap-6 md:w-80">
          <div className="sticky top-20 flex flex-col gap-6">
            <ApplyCard job={selected} />
            {similar.length > 0 && <SimilarRoles jobs={similar} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Header({ job }: { job: JobPosting }) {
  return (
    <div className="relative flex flex-col gap-4">
      <div className="absolute -left-4 bottom-1 top-1 hidden w-1 rounded-r-md bg-primary md:block" />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/discover" className="transition-colors hover:text-primary">
          Discover
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{job.title}</span>
      </div>

      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">{job.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-4 text-primary" />
            {job.company}
          </span>
          {(job.location || job.isRemote) && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" />
              {job.location ?? 'Remote'}
            </span>
          )}
          {job.postedAtLabel && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {job.postedAtLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {job.terms.map((t) => (
          <span
            key={t}
            className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            {TERM_LABELS[t]}
          </span>
        ))}
        {job.employmentType && (
          <span className="rounded-full border border-white/5 bg-secondary px-3 py-1 text-xs text-muted-foreground">
            {job.employmentType}
          </span>
        )}
        {job.isRemote && (
          <span className="rounded-full border border-white/5 bg-secondary px-3 py-1 text-xs text-muted-foreground">
            Remote
          </span>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading mb-4 border-l-4 border-primary pl-3 text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * JSearch returns one description blob. We split it into paragraphs and pull out
 * bullet-ish lines so it reads like the reference's structured sections without
 * inventing content that isn't there.
 */
function DescriptionBody({ text }: { text: string }) {
  const blocks = useMemo(() => {
    return text
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean)
      .map((block) => {
        const lines = block.split('\n').map((l) => l.trim())
        const bulletLines = lines.filter((l) => /^[•\-*]/.test(l))
        const isList = bulletLines.length >= 2
        return { block, lines, isList }
      })
  }, [text])

  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((b, i) =>
        b.isList ? (
          <ul key={i} className="space-y-2">
            {b.lines.map((l, j) => (
              <li key={j} className="flex items-start gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{l.replace(/^[•\-*]\s*/, '')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.block}</p>
        ),
      )}
    </div>
  )
}

function ApplyCard({ job }: { job: JobPosting }) {
  const createApplication = useJobStore((s) => s.createApplication)
  const applications = useJobStore((s) => s.applications)
  const saved = selectSavedApplyLinks(applications).has(job.applyLink)
  const [saving, setSaving] = useState(false)

  async function onSave() {
    setSaving(true)
    try {
      await createApplication(mapPostingToApplication(job))
      const err = useJobStore.getState().error
      if (err) toast.error('Could not save to tracker', { description: err })
      else toast.success('Saved to tracker', { description: `${job.title} — added to Pending` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-panel relative flex flex-col gap-5 overflow-hidden rounded-xl border border-primary/30 p-6">
      <div className="absolute left-1/2 top-0 h-1 w-40 -translate-x-1/2 bg-primary blur-md" />

      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-secondary">
          {job.companyLogo ? (
            <img
              src={job.companyLogo}
              alt=""
              className="size-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <Building2 className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-heading truncate text-lg font-semibold">{job.company}</h3>
          {job.publisher && (
            <span className="text-xs text-muted-foreground">via {job.publisher}</span>
          )}
        </div>
      </div>

      <a
        href={job.applyLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-colors hover:bg-primary/90"
      >
        Apply Now
        <ArrowRight className="size-4" />
      </a>

      <div className="flex items-center justify-between border-t border-white/5 pt-4 text-sm text-muted-foreground">
        <button
          onClick={onSave}
          disabled={saved || saving}
          className="flex items-center gap-2 transition-colors hover:text-primary disabled:hover:text-muted-foreground"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <BookmarkCheck className="size-4 text-primary" />
          ) : (
            <Bookmark className="size-4" />
          )}
          {saved ? 'Saved' : 'Save Job'}
        </button>
        <a
          href={job.applyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 transition-colors hover:text-primary"
        >
          <ExternalLink className="size-4" />
          Source
        </a>
      </div>
    </div>
  )
}

function SimilarRoles({ jobs }: { jobs: JobPosting[] }) {
  const open = useSelectedJob((s) => s.open)
  const navigate = useNavigate()

  return (
    <div className="rounded-xl border border-white/5 bg-card p-6">
      <h4 className="font-heading mb-4 flex items-center gap-2 text-base font-semibold">
        <Compass className="size-4 text-primary" />
        Similar Roles
      </h4>
      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <button
            key={job.id}
            onClick={() => {
              open(job, jobs)
              navigate(`/discover/${job.id}`)
            }}
            className={cn(
              'group block rounded-lg border border-transparent p-3 text-left transition-colors',
              'hover:border-primary/30 hover:bg-secondary',
            )}
          >
            <h5 className="text-sm font-medium transition-colors group-hover:text-primary">
              {job.title}
            </h5>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span className="truncate">{job.company}</span>
              <span className="shrink-0 pl-2">{job.location ?? (job.isRemote ? 'Remote' : '')}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
