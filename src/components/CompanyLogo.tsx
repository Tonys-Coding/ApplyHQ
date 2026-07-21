import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Company logo tile with layered fallbacks.
 *
 * 1. an explicit logo url (the JSearch employer_logo saved on a tracked job)
 * 2. otherwise a favicon derived from the company name — this is what gives
 *    cards saved before the logo column existed, and custom applications, a
 *    real mark instead of only initials
 * 3. finally an initials monogram
 *
 * Logos are letterboxed with object-contain on a white tile (never cropped or
 * stretched) so inconsistent source images still fit the square. DuckDuckGo's
 * icon service 404s on unknown domains, so a wrong/unknown guess falls cleanly
 * through to the monogram rather than showing a generic globe.
 */

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

const SUFFIXES =
  /\b(inc|llc|ltd|corp|corporation|co|company|group|technologies|technology|labs?|solutions|systems|holdings|plc|gmbh)\b\.?/gi

/* Everything up to the first separator is the real name; the rest is taglines,
   parent brands, etc. ("PVH (Tommy Hilfiger/Calvin Klein)" -> "PVH"). */
function primaryName(name: string): string {
  return (name.split(/[(/|,]/)[0] ?? name).replace(SUFFIXES, '').trim()
}

function guessFaviconUrl(name: string): string | null {
  const slug = primaryName(name).toLowerCase().replace(/[^a-z0-9]/g, '')
  return slug ? `https://icons.duckduckgo.com/ip3/${slug}.com.ico` : null
}

function initials(name: string): string {
  const words = primaryName(name)
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w))
  if (words.length === 0) return name.trim().slice(0, 2).toUpperCase() || '?'
  if (words.length === 1) return words[0].replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase()
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
  /* Ordered candidate images; onError advances to the next, and running off the
     end shows the monogram. */
  const candidates = useMemo(() => {
    const list: string[] = []
    if (src) list.push(src)
    const favicon = guessFaviconUrl(name)
    if (favicon) list.push(favicon)
    return list
  }, [src, name])

  const [idx, setIdx] = useState(0)
  useEffect(() => setIdx(0), [candidates])

  const current = candidates[idx]

  if (current) {
    return (
      <div
        className={cn(
          'grid shrink-0 place-items-center overflow-hidden rounded-md border border-black/5 bg-white',
          className,
        )}
      >
        <img
          src={current}
          alt={`${name} logo`}
          loading="lazy"
          onError={() => setIdx((i) => i + 1)}
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
