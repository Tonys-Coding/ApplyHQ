import { Eye, EyeOff, SlidersHorizontal } from 'lucide-react'
import { useResumeStore } from '@/stores/useResumeStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { nodeTitle, type ResumeNode, type ResumeSectionKey } from '@/types/domain'

/**
 * Quick visibility toggles, tucked into a popover to keep the sidebar clean.
 * Instant, local, free — hiding a project is a boolean flip, not a model call.
 */
const SECTIONS: ResumeSectionKey[] = [
  'technical_projects_and_experience',
  'other_work_history',
  'education',
]

export function QuickTogglesPopover() {
  const resume = useResumeStore((s) => s.resume)
  const toggleNode = useResumeStore((s) => s.toggleNode)

  const entries = resume
    ? SECTIONS.flatMap((section) =>
        (resume[section] as ResumeNode[]).map((node) => ({ section, node })),
      )
    : []

  const hiddenCount = entries.filter((e) => e.node.hidden).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" disabled={!resume}>
          <SlidersHorizontal className="size-3.5" />
          Sections
          {hiddenCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">
              {hiddenCount} hidden
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-72 p-2">
        <p className="px-1 pb-2 text-xs text-muted-foreground">
          Show or hide entries. Hidden items stay saved — toggle them back anytime.
        </p>
        <ScrollArea className="max-h-64">
          <div className="flex flex-wrap gap-1.5 p-1">
            {entries.length === 0 ? (
              <span className="text-xs text-muted-foreground">No entries yet.</span>
            ) : (
              entries.map(({ section, node }) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => toggleNode(section, node.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                    node.hidden
                      ? 'border-dashed text-muted-foreground hover:bg-accent'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
                  )}
                >
                  {node.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  <span className="max-w-36 truncate">{nodeTitle(node)}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
