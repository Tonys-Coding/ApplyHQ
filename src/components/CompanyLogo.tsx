import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Company logo tile with a graceful fallback.
 *
 * JSearch logos are small and inconsistent, so we letterbox them with
 * object-contain on a white tile (never crop/stretch) — that's what makes them
 * "fit the square." When there's no logo (custom applications) or the image
 * fails to load, we render an initials monogram instead, so every card and job
 * still shows a tidy, consistent mark.
 */

/* Deterministic tile color from the name, so a company always looks the same. */
const PALETTE = [
  'bg-rose-500',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-orange-500',
]

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function colorFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function CompanyLogo({
  src,
  name,
  className,
}: {
  src?: string | null
  name: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImg = src && !failed

  if (showImg) {
    return (
      <div
        className={cn(
          'grid shrink-0 place-items-center overflow-hidden rounded-md border border-black/5 bg-white',
          className,
        )}
      >
        <img
          src={src}
          alt={`${name} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-contain p-1"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-md font-semibold text-white',
        colorFor(name),
        className,
      )}
      aria-label={`${name} logo`}
    >
      <span className="text-[0.9em] leading-none">{initials(name)}</span>
    </div>
  )
}
