import { cn } from '@/lib/utils'

/**
 * TalentPulse mark — a "T" whose crossbar dissolves into a pulse waveform.
 *
 * Rebuilt as vector rather than embedding the supplied raster: an inline SVG
 * stays crisp at every size, inherits currentColor, and adds no image request.
 * Swap in the official asset later by replacing this file only.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn('size-6', className)}
      role="img"
      aria-label="TalentPulse"
    >
      {/* T crossbar */}
      <rect x="10" y="9" width="28" height="6" rx="3" fill="currentColor" />
      {/* T stem */}
      <rect x="21" y="12" width="6" height="14" rx="3" fill="currentColor" />
      {/* Pulse waveform through the lower half */}
      <path
        d="M6 30 H16 L20 20 L26 38 L30 30 H42"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Icon + wordmark lockup. */
export function LogoWordmark({
  className,
  markClassName,
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={cn('size-6 text-primary', markClassName)} />
      <span className="font-heading text-lg font-bold tracking-tight text-foreground">
        Talent<span className="text-primary">Pulse</span>
      </span>
    </span>
  )
}
