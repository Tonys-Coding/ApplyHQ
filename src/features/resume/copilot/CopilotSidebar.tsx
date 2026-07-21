import { Sparkles } from 'lucide-react'
import { ChangeLog } from './ChangeLog'
import { PromptComposer } from './PromptComposer'
import { FitScoreSection } from '@/features/matrix/components/FitScoreSection'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * Copilot sidebar, three clean zones:
 *   1. Fit score + change log (scrolls together)
 *   2. Composer, pinned at the bottom, with strictness + quick section toggles
 *      tucked into it — no separate toggle strip cluttering the column.
 */
export function CopilotSidebar() {
  return (
    <aside className="flex h-full w-88 shrink-0 flex-col border-l bg-sidebar">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-xs font-semibold tracking-tight">Copilot</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <FitScoreSection />
        <ChangeLog />
      </ScrollArea>

      <PromptComposer />
    </aside>
  )
}
