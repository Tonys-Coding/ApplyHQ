import { useJobStore, selectGhostedCount } from '@/stores/useJobStore'
import { KanbanBoard } from '@/features/kanban/components/KanbanBoard'
import { AddApplicationDialog } from '@/features/kanban/components/AddApplicationDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Ghost } from 'lucide-react'

export function Board() {
  const applications = useJobStore((s) => s.applications)
  const ghosted = selectGhostedCount(applications)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:px-8">
      <PageHeader title="Tracker" subtitle="Drag applications between stages as they progress.">
        {ghosted > 0 && (
          <Badge variant="outline" className="gap-1 border-warning/40 text-warning">
            <Ghost className="size-3" />
            {ghosted} going quiet
          </Badge>
        )}
        <AddApplicationDialog />
      </PageHeader>

      <KanbanBoard />
    </div>
  )
}
