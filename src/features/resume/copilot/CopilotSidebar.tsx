import { Sparkles } from 'lucide-react'
import { ChangeLog } from './ChangeLog'
import { PromptComposer } from './PromptComposer'
import { QuickActionCards } from './QuickActionCards'

export function CopilotSidebar() {
  return (
    <aside className="flex h-full w-[22rem] shrink-0 flex-col border-l bg-sidebar">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <Sparkles className="size-3.5 text-violet-500" />
        <span className="text-xs font-semibold tracking-tight">Copilot</span>
      </div>

      <ChangeLog />
      <QuickActionCards />
      <PromptComposer />
    </aside>
  )
}
