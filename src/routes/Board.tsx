import { useEffect } from 'react'
import { useJobStore, selectColumn } from '@/stores/useJobStore'
import { STAGES, STAGE_LABELS } from '@/features/kanban/lib/stages'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Ghost } from 'lucide-react'

/**
 * Placeholder board — renders real data from the store and proves the ghost
 * math, but has no drag-and-drop yet. dnd-kit wiring is the next step.
 */
export function Board() {
  const applications = useJobStore((s) => s.applications)
  const loading = useJobStore((s) => s.loading)
  const fetchApplications = useJobStore((s) => s.fetchApplications)

  useEffect(() => {
    void fetchApplications()
  }, [fetchApplications])

  return (
    <>
      <TopBar title="Tracker" />
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
        {STAGES.map((stage) => {
          const column = selectColumn(applications, stage)
          return (
            <div key={stage} className="flex w-72 shrink-0 flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold">{STAGE_LABELS[stage]}</span>
                <Badge variant="secondary" className="tabular-nums">
                  {column.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-2">
                {column.map((app) => (
                  <Card
                    key={app.id}
                    className={cn(
                      'gap-1 p-3 transition-shadow hover:shadow-md',
                      app.isGhosted && 'border-amber-500/40',
                    )}
                  >
                    <div className="text-sm font-medium">{app.role_title}</div>
                    <div className="text-xs text-muted-foreground">{app.company_name}</div>
                    {app.isGhosted && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-500">
                        <Ghost className="size-3" />
                        Silent {app.idleDays} days
                      </div>
                    )}
                  </Card>
                ))}
                {!loading && column.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
