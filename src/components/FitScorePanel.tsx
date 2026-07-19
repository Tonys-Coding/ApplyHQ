import { AlertTriangle, Check, Loader2, Target, X } from 'lucide-react'
import type { FitReport } from '@/features/matrix/lib/fit'
import { cn } from '@/lib/utils'

/**
 * Keyword Matrix & Fit Score.
 *
 * The score is the deterministic value computed server-side from the model's
 * extraction — same input, same number. The gauge bands it by colour and the
 * lists spell out exactly which terms earned or cost points, with a dedicated
 * high-alert block for missing *required* keywords (the critical gaps).
 */
export function FitScorePanel({
  report,
  loading,
  error,
}: {
  report: FitReport | null
  loading?: boolean
  error?: string | null
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Scoring your resume against this role…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        {error}
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-xs text-muted-foreground">
        <Target className="size-6" />
        <p>Pick a target job to see how your resume matches it.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Gauge score={report.fitScore} />
        <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{report.summary}</p>
      </div>

      {report.criticalGaps.length > 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <AlertTriangle className="size-3.5" />
            Critical gaps — required, and missing
          </div>
          <div className="flex flex-wrap gap-1.5">
            {report.criticalGaps.map((term) => (
              <span
                key={term}
                className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-xs text-primary"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}

      <KeywordList
        title="Matched"
        icon={<Check className="size-3.5 text-success" />}
        terms={report.matchedKeywords}
        tone="matched"
        emptyLabel="Nothing matched yet."
      />
      <KeywordList
        title="Missing"
        icon={<X className="size-3.5 text-muted-foreground" />}
        terms={report.missingKeywords.filter((t) => !report.criticalGaps.includes(t))}
        tone="missing"
        emptyLabel="No gaps — nice."
      />
    </div>
  )
}

function Gauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const R = 30
  const C = 2 * Math.PI * R
  const offset = C * (1 - clamped / 100)

  // Band the arc colour so the number reads at a glance.
  const stroke =
    clamped >= 75 ? 'var(--success)' : clamped >= 50 ? 'var(--warning)' : 'var(--primary)'

  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={R} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-xl font-bold tabular-nums">{clamped}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">fit</span>
      </div>
    </div>
  )
}

function KeywordList({
  title,
  icon,
  terms,
  tone,
  emptyLabel,
}: {
  title: string
  icon: React.ReactNode
  terms: string[]
  tone: 'matched' | 'missing'
  emptyLabel: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
        {icon}
        {title}
        <span className="text-muted-foreground">({terms.length})</span>
      </div>
      {terms.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {terms.map((term) => (
            <span
              key={term}
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs',
                tone === 'matched'
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-border bg-secondary text-muted-foreground',
              )}
            >
              {term}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
