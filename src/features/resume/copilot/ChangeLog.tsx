import { Eye, History, Pencil, Ruler, Sparkles } from 'lucide-react'
import { useResumeStore } from '@/stores/useResumeStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChangeLogEntry } from '@/types/domain'

const KIND_ICON: Record<ChangeLogEntry['kind'], typeof Sparkles> = {
  ai_edit: Sparkles,
  visibility: Eye,
  format: Ruler,
  user_edit: Pencil,
}

const KIND_TINT: Record<ChangeLogEntry['kind'], string> = {
  ai_edit: 'text-violet-500',
  visibility: 'text-blue-500',
  format: 'text-muted-foreground',
  user_edit: 'text-emerald-500',
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

export function ChangeLog() {
  const changeLog = useResumeStore((s) => s.changeLog)
  const clearLog = useResumeStore((s) => s.clearLog)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-3 py-2">
        <History className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">Changes</span>
        {changeLog.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLog}
            className="ml-auto h-6 px-2 text-xs text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {changeLog.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Edits and AI tailoring will be itemized here, so nothing changes on your
            resume without you seeing it.
          </p>
        ) : (
          <ul className="space-y-1 px-2 pb-2">
            {changeLog.map((entry) => {
              const Icon = KIND_ICON[entry.kind]
              return (
                <li key={entry.id} className="rounded-md px-2 py-1.5 hover:bg-accent/50">
                  <div className="flex items-start gap-2">
                    <Icon className={cn('mt-0.5 size-3.5 shrink-0', KIND_TINT[entry.kind])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug">{entry.summary}</p>
                      {entry.before && entry.after && (
                        <div className="mt-1 space-y-0.5 text-[11px] leading-tight">
                          <p className="text-muted-foreground line-through">{entry.before}</p>
                          <p className="text-foreground">{entry.after}</p>
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {timeAgo(entry.timestamp)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
