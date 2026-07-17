import { Search } from 'lucide-react'
import type { TermKey } from '@/types/jobs'
import { TERM_PRESETS } from '@/features/discovery/lib/termPresets'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface SearchDraft {
  query: string
  location: string
  datePosted: 'all' | 'today' | '3days' | 'week' | 'month'
}

const DATE_OPTIONS: { value: SearchDraft['datePosted']; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Past 3 days' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
]

interface Props {
  draft: SearchDraft
  onDraftChange: (patch: Partial<SearchDraft>) => void
  /** Commits the draft — the ONLY thing that spends a request. */
  onSubmit: () => void
  activeTerms: TermKey[]
  onToggleTerm: (term: TermKey) => void
}

export function SearchControls({
  draft,
  onDraftChange,
  onSubmit,
  activeTerms,
  onToggleTerm,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft.query}
            onChange={(e) => onDraftChange({ query: e.target.value })}
            placeholder="Role or keywords — e.g. software engineer intern"
            className="pl-9"
          />
        </div>
        <Input
          value={draft.location}
          onChange={(e) => onDraftChange({ location: e.target.value })}
          placeholder="Location"
          className="sm:w-52"
        />
        <Select
          value={draft.datePosted}
          onValueChange={(v) => onDraftChange({ datePosted: v as SearchDraft['datePosted'] })}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Search</Button>
      </form>

      {/* Term chips filter the already-fetched results locally — instant, and
          they spend nothing against the quota. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Cycle:</span>
        {TERM_PRESETS.map((p) => {
          const active = activeTerms.includes(p.key)
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onToggleTerm(p.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-coral/40 bg-coral/15 text-coral-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
