import { Building2, DollarSign, Ghost, GripVertical, MapPin, Trash2 } from 'lucide-react'
import type { GhostedApplication } from '@/features/kanban/lib/ghosting'
import { useJobStore } from '@/stores/useJobStore'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { CompanyLogo } from '@/components/CompanyLogo'

interface Props {
  app: GhostedApplication
  dragging?: boolean
  handleProps?: React.HTMLAttributes<HTMLButtonElement>
}

export function ApplicationCard({ app, dragging, handleProps }: Props) {
  const deleteApplication = useJobStore((s) => s.deleteApplication)

  return (
    <Card
      className={cn(
        'group/card gap-2 p-3 transition-shadow',
        dragging ? 'rotate-1 shadow-lg' : 'hover:shadow-md',
        app.isGhosted && 'border-warning/50',
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...handleProps}
          aria-label="Drag card"
          className="no-print -ml-1 mt-0.5 cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        <CompanyLogo src={app.company_logo} name={app.company_name} className="size-9 text-xs" />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div>
            <div className="truncate text-sm font-medium leading-tight">{app.role_title}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="size-3 shrink-0" />
              <span className="truncate">{app.company_name}</span>
            </div>
          </div>

          {(app.job_location || app.salary_or_hourly_rate) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {app.job_location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {app.job_location}
                </span>
              )}
              {app.salary_or_hourly_rate && (
                <span className="inline-flex items-center gap-1">
                  <DollarSign className="size-3" />
                  {app.salary_or_hourly_rate}
                </span>
              )}
            </div>
          )}

          {app.isGhosted && (
            <div className="inline-flex w-fit items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
              <Ghost className="size-3" />
              Silent {app.idleDays} days
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => deleteApplication(app.id)}
          aria-label="Delete application"
          className="opacity-0 transition-opacity hover:text-destructive group-hover/card:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </Card>
  )
}
