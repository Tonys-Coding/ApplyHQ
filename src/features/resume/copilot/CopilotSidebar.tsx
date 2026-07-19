import { Sparkles } from 'lucide-react'
import { ChangeLog } from './ChangeLog'
import { PromptComposer } from './PromptComposer'
import { QuickActionCards } from './QuickActionCards'
import { FitScoreSection } from '@/features/matrix/components/FitScoreSection'
import { ScrollArea } from '@/components/ui/scroll-area'

export function CopilotSidebar() {
  return (
    <aside className="flex h-full w-[24rem] shrink-0 flex-col border-l bg-sidebar">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-xs font-semibold tracking-tight">Copilot</span>
      </div>

      {/* Fit score + change log scroll together; composer + quick actions pin. */}
      <ScrollArea className="min-h-0 flex-1">
        <FitScoreSection />
        <ChangeLog />
      </ScrollArea>

      <QuickActionCards />
      <PromptComposer />
    </aside>
  )
}
