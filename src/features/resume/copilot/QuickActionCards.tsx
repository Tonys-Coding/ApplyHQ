import { Eye, EyeOff } from 'lucide-react'
import { useResumeStore } from '@/stores/useResumeStore'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { nodeTitle, type ResumeNode, type ResumeSectionKey } from '@/types/domain'

/**
 * One card per hideable resume entry.
 *
 * These are the "toggle visibility on hidden projects/skills" actions: instant,
 * local, and free. No model call — hiding a project is a known operation, and
 * routing it through an LLM would be slower, costlier, and less predictable
 * than a boolean flip.
 */

const SECTIONS: ResumeSectionKey[] = [
  'technical_projects_and_experience',
  'other_work_history',
  'education',
]

export function QuickActionCards() {
  const resume = useResumeStore((s) => s.resume)
  const toggleNode = useResumeStore((s) => s.toggleNode)

  if (!resume) return null

  const entries = SECTIONS.flatMap((section) =>
    (resume[section] as ResumeNode[]).map((node) => ({ section, node })),
  )

  if (entries.length === 0) return null

  return (
    <div className="border-t">
      <div className="px-3 py-2 text-xs font-medium">Quick toggles</div>
      <ScrollArea className="max-h-40">
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {entries.map(({ section, node }) => (
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
              <span className="max-w-32 truncate">{nodeTitle(node)}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
